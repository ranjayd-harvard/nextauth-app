// src/app/api/user/add-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { sendEmail, emailTemplates } from '@/lib/email'
import { TokenManager } from '@/lib/tokens'

// POST method to add email to existing user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { email } = await req.json()

    console.log('📧 Add email request for user:', session.user.id, { email })

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Check if current user exists
    const currentUser = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is already taken by another user
    const emailOwner = await users.findOne({ 
      email: email.toLowerCase(),
      _id: { $ne: new ObjectId(session.user.id) } // Exclude current user
    })
    
    if (emailOwner) {
      console.log('📧 Email already taken by another user:', emailOwner._id)
      return NextResponse.json(
        { 
          error: 'This email address is already associated with another account. Would you like to link these accounts instead?',
          suggestLinking: true,
          candidateUserId: emailOwner._id
        },
        { status: 409 }
      )
    }

    // Check if this email is already linked to current user
    if (currentUser.email === email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This email is already your primary email address' },
        { status: 409 }
      )
    }

    // Check if email is in linkedEmails array
    if (currentUser.linkedEmails && currentUser.linkedEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: 'This email is already linked to your account' },
        { status: 409 }
      )
    }

    console.log('📧 Adding email to user account...')

    // Add email to linkedEmails array
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $addToSet: { 
          linkedEmails: email.toLowerCase() 
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('📧 Failed to update user with new email')
      return NextResponse.json(
        { error: 'Failed to add email to account' },
        { status: 500 }
      )
    }

    console.log('📧 Email added successfully, sending verification...')

    // Generate verification token
    const verificationToken = await TokenManager.createToken(
      email.toLowerCase(),
      'email_verification',
      24 * 60, // 24 hours in minutes
      session.user.id
    )

    // Send verification email
    let emailSent = false
    let emailError = null

    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-linked-email?token=${verificationToken}`
      const emailTemplate = emailTemplates.linkedEmailVerification(
        currentUser.name || 'User', 
        email.toLowerCase(),
        verificationUrl
      )
      
      const emailResult = await sendEmail({
        to: email.toLowerCase(),
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
        console.warn('⚠️ Verification email sending failed:', emailResult.error)
      }
    } catch (error) {
      console.warn('⚠️ Verification email sending failed:', error)
      emailError = error.message
    }

    console.log('📧 Email added successfully:', {
      userId: session.user.id,
      newEmail: email.toLowerCase(),
      emailSent
    })

    return NextResponse.json(
      { 
        success: true,
        message: emailSent 
          ? 'Email added successfully! Please check your inbox to verify the new email address.'
          : 'Email added successfully, but verification email could not be sent. You can request verification later.',
        email: email.toLowerCase(),
        requiresVerification: true,
        emailSent,
        emailError: emailError || undefined,
        // Only include in development
        verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Add email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to resend verification for linked email
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is linked to this user
    if (!user.linkedEmails || !user.linkedEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: 'Email not found in linked emails' },
        { status: 400 }
      )
    }

    console.log('📧 Resending verification for linked email:', email)

    // Generate new verification token
    const verificationToken = await TokenManager.createToken(
      email.toLowerCase(),
      'email_verification',
      24 * 60, // 24 hours in minutes
      session.user.id
    )

    // Send verification email
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-linked-email?token=${verificationToken}`
      const emailTemplate = emailTemplates.linkedEmailVerification(
        user.name || 'User',
        email.toLowerCase(), 
        verificationUrl
      )
      
      const emailResult = await sendEmail({
        to: email.toLowerCase(),
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      if (!emailResult.success) {
        console.error('📧 Resend verification email failed:', emailResult.error)
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        )
      }

      console.log('📧 Verification email resent successfully')

      return NextResponse.json(
        { 
          success: true,
          message: 'Verification email sent successfully',
          email: email.toLowerCase(),
          // Only include in development
          verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
        },
        { status: 200 }
      )

    } catch (error) {
      console.error('📧 Resend verification error:', error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Resend verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE method to remove linked email
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent removing primary email
    if (user.email === email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot remove primary email address' },
        { status: 400 }
      )
    }

    console.log('📧 Removing linked email:', email)

    // Remove email from linkedEmails array
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $pull: { 
          linkedEmails: email.toLowerCase() 
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to remove email from account' },
        { status: 500 }
      )
    }

    console.log('📧 Email removed successfully')

    return NextResponse.json(
      { 
        success: true,
        message: 'Email removed from account successfully',
        email: email.toLowerCase()
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Remove email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}