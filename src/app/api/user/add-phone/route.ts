// src/app/api/user/add-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { sendVerificationCode } from '@/lib/sms'
import { TokenManager } from '@/lib/tokens'

// Simple phone formatting function
function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  const countryPrefixes: Record<string, string> = {
    'US': '+1', 'CA': '+1', 'GB': '+44', 'IN': '+91',
    'AU': '+61', 'DE': '+49', 'FR': '+33', 'JP': '+81',
    'BR': '+55', 'MX': '+52'
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

// POST method to add phone number to existing OAuth user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { phoneNumber, countryCode } = await req.json()

    console.log('📱 Add phone request for user:', session.user.id, { phoneNumber, countryCode })

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode || 'US')
    console.log('📱 Formatted phone:', formattedPhone)

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

    // Check if phone number is already taken by another user
    const phoneOwner = await users.findOne({ 
      phoneNumber: formattedPhone,
      _id: { $ne: new ObjectId(session.user.id) } // Exclude current user
    })
    
    if (phoneOwner) {
      console.log('📱 Phone already taken by another user:', phoneOwner._id)
      return NextResponse.json(
        { error: 'This phone number is already registered to another account' },
        { status: 409 }
      )
    }

    // Update user with new phone number (unverified)
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          phoneNumber: formattedPhone,
          phoneVerified: false,
          phoneVerifiedAt: null,
          updatedAt: new Date()
        },
        $addToSet: {
          linkedPhones: formattedPhone
        }
      }
    )

    console.log('📱 Phone number added to user, sending verification code...')

    // Send verification code
    const verificationResult = await sendVerificationCode(formattedPhone)
    
    if (!verificationResult.success) {
      console.error('📱 SMS sending failed:', verificationResult.error)
      
      // Rollback phone number addition
      await users.updateOne(
        { _id: new ObjectId(session.user.id) },
        { 
          $unset: { 
            phoneNumber: "",
            phoneVerified: "",
            phoneVerifiedAt: ""
          },
          $pull: {
            linkedPhones: formattedPhone
          }
        }
      )
      
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    console.log('📱 Verification code sent successfully:', verificationResult.sid)

    // Store verification code if using basic SMS (not Twilio Verify)
    if (verificationResult.code) {
      await TokenManager.createToken(
        formattedPhone,
        'phone_verification',
        10, // 10 minutes
        session.user.id
      )
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Phone number added successfully. Please verify it.',
        phoneNumber: formattedPhone,
        requiresVerification: true,
        verificationSid: verificationResult.sid,
        // Only include in development
        verificationCode: process.env.NODE_ENV === 'development' ? verificationResult.code : undefined
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Add phone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to resend verification code for current user's phone
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user || !user.phoneNumber) {
      return NextResponse.json(
        { error: 'No phone number found for this account' },
        { status: 400 }
      )
    }

    if (user.phoneVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified' },
        { status: 409 }
      )
    }

    console.log('📱 Resending verification code to:', user.phoneNumber)

    // Send verification code
    const verificationResult = await sendVerificationCode(user.phoneNumber)
    
    if (!verificationResult.success) {
      console.error('📱 Resend SMS failed:', verificationResult.error)
      return NextResponse.json(
        { error: 'Failed to resend verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Store verification code if using basic SMS
    if (verificationResult.code) {
      await TokenManager.createToken(
        user.phoneNumber,
        'phone_verification',
        10, // 10 minutes
        session.user.id
      )
    }

    console.log('📱 Verification code resent successfully:', verificationResult.sid)

    return NextResponse.json(
      { 
        success: true,
        message: 'Verification code sent successfully',
        phoneNumber: user.phoneNumber,
        verificationSid: verificationResult.sid,
        // Only include in development
        verificationCode: process.env.NODE_ENV === 'development' ? verificationResult.code : undefined
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Resend phone verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE method to remove phone number from account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $unset: { 
          phoneNumber: "",
          phoneVerified: "",
          phoneVerifiedAt: ""
        },
        $set: {
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

    console.log('📱 Phone number removed for user:', session.user.id)

    return NextResponse.json(
      { 
        success: true,
        message: 'Phone number removed successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Remove phone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}