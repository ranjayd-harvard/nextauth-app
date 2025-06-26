// src/app/api/user/verify-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import { TokenManager } from '@/lib/tokens'
import { verifyCode } from '@/lib/sms'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { phoneNumber, code, userId } = await req.json()

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    let targetUserId: string
    let targetPhoneNumber: string

    // If session exists, use the logged-in user (for OAuth users adding phone)
    if (session?.user?.id) {
      targetUserId = session.user.id
      
      // Get user's phone number from database
      const client = await clientPromise
      const users = client.db().collection('users')
      const user = await users.findOne({ _id: new ObjectId(targetUserId) })
      
      if (!user || !user.phoneNumber) {
        return NextResponse.json(
          { error: 'No phone number found for verification' },
          { status: 400 }
        )
      }
      
      targetPhoneNumber = user.phoneNumber
      
      if (user.phoneVerified) {
        return NextResponse.json(
          { error: 'Phone number is already verified' },
          { status: 409 }
        )
      }
    } 
    // For phone registration flow (no session yet)
    else if (phoneNumber && userId) {
      targetUserId = userId
      targetPhoneNumber = phoneNumber
    } 
    else {
      return NextResponse.json(
        { error: 'Authentication required or phone number and user ID must be provided' },
        { status: 400 }
      )
    }

    console.log('📱 Verifying phone for user:', targetUserId, 'phone:', targetPhoneNumber)

    let verificationResult

    // Verify using Twilio Verify service if available
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      verificationResult = await verifyCode(targetPhoneNumber, code)
      
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
        targetPhoneNumber
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
      { _id: new ObjectId(targetUserId) },
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

    console.log('✅ Phone verified successfully for user:', targetUserId)

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $push: { 
          securityLog: {
            event: 'phone_verified',
            timestamp: new Date(),
            phoneNumber: targetPhoneNumber,
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    return NextResponse.json(
      { 
        success: true,
        message: 'Phone number verified successfully!',
        phoneNumber: targetPhoneNumber,
        verified: true
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Phone verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}