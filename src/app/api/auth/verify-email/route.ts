import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokens'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Verify the token
    const verificationResult = await TokenManager.verifyToken(token, 'email_verification')
    
    if (!verificationResult.valid) {
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 }
      )
    }

    // Update user's email verification status
    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateResult = await users.updateOne(
      { _id: new ObjectId(verificationResult.userId) },
      { 
        $set: { 
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Email verified successfully!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
