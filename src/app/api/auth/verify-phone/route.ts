import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokens'
import { verifyCode } from '@/lib/sms'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, code } = await req.json()

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      )
    }

    let verificationResult

    // Verify using Twilio Verify service if available
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      verificationResult = await verifyCode(phoneNumber, code)
      
      if (!verificationResult.success) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 400 }
        )
      }
    } else {
      // Verify using our token system
      verificationResult = await TokenManager.verifyToken(
        code,
        'phone_verification',
        phoneNumber
      )
      
      if (!verificationResult.valid) {
        return NextResponse.json(
          { 
            error: verificationResult.error,
            attemptsLeft: verificationResult.attemptsLeft 
          },
          { status: 400 }
        )
      }
    }

    // Update user's phone verification status
    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateResult = await users.updateOne(
      { phoneNumber },
      { 
        $set: { 
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
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
      { message: 'Phone number verified successfully!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Phone verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
