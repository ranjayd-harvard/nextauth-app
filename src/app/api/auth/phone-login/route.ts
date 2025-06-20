import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { sendVerificationCode } from '@/lib/sms'

// Simple phone formatting
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

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, countryCode } = await req.json()

    console.log('🔐 Phone login request:', { phoneNumber, countryCode })

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode || 'US')
    console.log('🔐 Formatted phone:', formattedPhone)

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Find user by phone number
    const user = await users.findOne({ phoneNumber: formattedPhone })
    
    if (!user) {
      console.log('🔐 User not found for phone:', formattedPhone)
      // For security, don't reveal whether phone exists
      return NextResponse.json(
        { message: 'If an account with that phone number exists, we have sent a login code.' },
        { status: 200 }
      )
    }

    if (!user.phoneVerified) {
      console.log('🔐 Phone not verified for user:', user._id)
      return NextResponse.json(
        { error: 'Phone number is not verified. Please verify your phone number first.' },
        { status: 400 }
      )
    }

    console.log('🔐 Sending login code to verified user:', user._id)

    // Generate and send login code
    const verificationResult = await sendVerificationCode(formattedPhone)
    
    if (!verificationResult.success) {
      console.error('🔐 Failed to send login code:', verificationResult.error)
      return NextResponse.json(
        { error: 'Failed to send login code. Please try again.' },
        { status: 500 }
      )
    }

    console.log('🔐 Login code sent successfully:', verificationResult.sid)

    return NextResponse.json(
      { 
        message: 'Login code sent successfully',
        phoneNumber: formattedPhone 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('🔐 Phone login error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
