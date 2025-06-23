// src/app/api/auth/verify-phone/route.ts - REPLACE YOUR EXISTING FILE
import { NextRequest, NextResponse } from 'next/server'
import { TokenManager } from '@/lib/tokens'
import { verifyCode } from '@/lib/sms'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

// CRITICAL: Use the SAME phone formatting function as in enhanced-phone-register
function formatPhoneNumber(phoneNumber: string, countryCode: string = 'US'): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  const countryPrefixes: Record<string, string> = {
    'US': '+1', 'CA': '+1', 'GB': '+44', 'IN': '+91',
    'AU': '+61', 'DE': '+49', 'FR': '+33', 'JP': '+81',
    'BR': '+55', 'MX': '+52', 'IT': '+39', 'ES': '+34',
    'NL': '+31', 'SE': '+46', 'NO': '+47', 'DK': '+45',
    'FI': '+358', 'PL': '+48', 'CZ': '+420', 'HU': '+36'
  }
  
  const prefix = countryPrefixes[countryCode] || '+1'
  
  if (phoneNumber.startsWith('+')) {
    return phoneNumber
  }
  
  if ((countryCode === 'US' || countryCode === 'CA') && cleaned.startsWith('1')) {
    return `+1${cleaned.substring(1)}`
  }
  
  return `${prefix}${cleaned}`
}

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, code, countryCode } = await req.json()

    console.log('📱 Raw verification request:', { phoneNumber, code, countryCode })

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      )
    }

    // CRITICAL: Format phone number the same way as registration
    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode || 'US')
    console.log('📱 Verifying code for FORMATTED phone:', formattedPhone)

    let verificationResult

    // Verify using Twilio Verify service if available
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log('📱 Using Twilio Verify Service...')
      verificationResult = await verifyCode(formattedPhone, code)
      
      if (!verificationResult.success) {
        console.log('📱 Twilio verification failed:', verificationResult.error)
        return NextResponse.json(
          { error: verificationResult.error || 'Invalid or expired verification code' },
          { status: 400 }
        )
      }
    } else {
      console.log('📱 Using token-based verification...')
      // Verify using our token system
      verificationResult = await TokenManager.verifyToken(
        code,
        'phone_verification',
        formattedPhone
      )
      
      if (!verificationResult.valid) {
        console.log('📱 Token verification failed:', verificationResult.error)
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
    
    console.log('📱 Looking for user with formatted phone:', formattedPhone)
    
    const updateResult = await users.updateOne(
      { phoneNumber: formattedPhone },
      { 
        $set: { 
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.log('📱 ERROR: No user found with phone:', formattedPhone)
      
      // Debug: Try to find user with any variation of the phone number
      const allUsers = await users.find({ 
        phoneNumber: { $regex: phoneNumber.replace(/\D/g, ''), $options: 'i' } 
      }).toArray()
      
      console.log('📱 DEBUG: Found users with similar phone patterns:', 
        allUsers.map(u => ({ 
          id: u._id, 
          phone: u.phoneNumber,
          verified: u.phoneVerified 
        }))
      )
      
      return NextResponse.json(
        { error: 'User not found with this phone number. Please register first.' },
        { status: 404 }
      )
    }

    console.log('✅ Phone verified successfully for:', formattedPhone)

    return NextResponse.json(
      { 
        success: true,
        message: 'Phone number verified successfully!',
        phoneNumber: formattedPhone
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