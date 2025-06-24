// src/app/api/user/verify-linked-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { TokenManager } from '@/lib/tokens'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    console.log('📧 Verifying linked email with token:', token)

    // Verify the token
    const tokenData = await TokenManager.verifyToken(token, 'email_verification')
    
    if (!tokenData.valid) {
      console.log('📧 Invalid or expired token')
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    const { userId, email } = tokenData
    console.log('📧 Token verified for email:', email, 'userId:', userId)

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Find the user
    const user = await users.findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      console.log('📧 User not found for verification')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is in linkedEmails
    if (!user.linkedEmails || !user.linkedEmails.includes(email)) {
      console.log('📧 Email not found in linkedEmails')
      return NextResponse.json(
        { error: 'Email not found in linked emails' },
        { status: 400 }
      )
    }

    // Add to verifiedEmails array
    const updateResult = await users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $addToSet: { 
          verifiedEmails: email 
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('📧 Failed to update user with verified email')
      return NextResponse.json(
        { error: 'Failed to verify email' },
        { status: 500 }
      )
    }

    console.log('📧 Email verified successfully:', email)

    return NextResponse.json(
      { 
        success: true,
        message: 'Email verified successfully!',
        email,
        verified: true
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Verify linked email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method for verifying via URL (like the main email verification)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=missing-token`)
    }

    console.log('📧 Verifying linked email via GET with token:', token)

    // Verify the token
    const tokenData = await TokenManager.verifyToken(token, 'email_verification')
    
    if (!tokenData.valid) {
      console.log('📧 Invalid or expired token')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=invalid-token`)
    }

    const { userId, email } = tokenData
    console.log('📧 Token verified for email:', email, 'userId:', userId)

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Find the user
    const user = await users.findOne({ _id: new ObjectId(userId) })
    
    if (!user) {
      console.log('📧 User not found for verification')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=user-not-found`)
    }

    // Check if email is in linkedEmails
    if (!user.linkedEmails || !user.linkedEmails.includes(email)) {
      console.log('📧 Email not found in linkedEmails')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=email-not-found`)
    }

    // Add to verifiedEmails array
    const updateResult = await users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $addToSet: { 
          verifiedEmails: email 
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('📧 Failed to update user with verified email')
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=verification-failed`)
    }

    console.log('📧 Email verified successfully via GET:', email)

    // Redirect to security page with success message
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?email_verified=true&email=${encodeURIComponent(email)}`)

  } catch (error) {
    console.error('❌ Verify linked email GET error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/account/security?error=server-error`)
  }
}