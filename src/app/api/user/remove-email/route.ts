// src/app/api/user/remove-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { email, isPrimary } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    console.log('📧 Remove email request for user:', session.user.id, { email, isPrimary })

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Get current user
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent removing primary email
    if (isPrimary || user.email === email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot remove primary email address. Please set another email as primary first.' },
        { status: 400 }
      )
    }

    // Check if user has other verified authentication methods
    const hasOtherMethods = user.phoneVerified || 
                           (user.linkedProviders && user.linkedProviders.length > 0) ||
                           (user.verifiedEmails && user.verifiedEmails.length > 1)

    if (!hasOtherMethods) {
      return NextResponse.json(
        { error: 'Cannot remove email. You must have at least one verified authentication method.' },
        { status: 400 }
      )
    }

    // Check if email exists in linkedEmails or verifiedEmails
    const emailInLinked = user.linkedEmails && user.linkedEmails.includes(email.toLowerCase())
    const emailInVerified = user.verifiedEmails && user.verifiedEmails.includes(email.toLowerCase())

    if (!emailInLinked && !emailInVerified) {
      return NextResponse.json(
        { error: 'Email not found in your linked emails' },
        { status: 404 }
      )
    }

    console.log('📧 Removing email from user account...')

    // Remove email from both linkedEmails and verifiedEmails arrays
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $pull: { 
          linkedEmails: email.toLowerCase(),
          verifiedEmails: email.toLowerCase()
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('📧 Failed to remove email from user')
      return NextResponse.json(
        { error: 'Failed to remove email from account' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: 'email_removed',
            timestamp: new Date(),
            email: email.toLowerCase(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log('📧 Email removed successfully:', email)

    return NextResponse.json(
      { 
        success: true,
        message: `Email ${email} removed from account successfully`,
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