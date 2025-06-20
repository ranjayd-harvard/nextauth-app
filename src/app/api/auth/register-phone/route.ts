import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import { sendVerificationCode } from '@/lib/sms'
import { TokenManager } from '@/lib/tokens'
import { AccountLinkingService } from '@/lib/account-linking'

// Simple phone formatting (without libphonenumber-js dependency issues)
function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Add country prefix based on selection
  const countryPrefixes: Record<string, string> = {
    'US': '+1',
    'CA': '+1',
    'GB': '+44',
    'IN': '+91',
    'AU': '+61',
    'DE': '+49',
    'FR': '+33',
    'JP': '+81',
    'BR': '+55',
    'MX': '+52'
  }
  
  const prefix = countryPrefixes[countryCode] || '+1'
  
  // If already has country code, don't add again
  if (phoneNumber.startsWith('+')) {
    return phoneNumber
  }
  
  // For US/CA, remove leading 1 if present
  if ((countryCode === 'US' || countryCode === 'CA') && cleaned.startsWith('1')) {
    return `+1${cleaned.substring(1)}`
  }
  
  return `${prefix}${cleaned}`
}

function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation for international format
  const phoneRegex = /^\+[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber)
}

function generatePhoneAvatar(phoneNumber: string): string {
  const lastFour = phoneNumber.slice(-4)
  const colors = [
    '3B82F6', '10B981', 'F59E0B', 'EF4444', 
    '8B5CF6', '06B6D4', 'F97316', 'EC4899'
  ]
  
  const colorIndex = phoneNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const backgroundColor = colors[colorIndex]
  
  return `https://ui-avatars.com/api/?name=${lastFour}&background=${backgroundColor}&color=ffffff&size=200&bold=true`
}

export async function POST(req: NextRequest) {
  try {
    const { name, phoneNumber, countryCode } = await req.json()

    console.log('📱 Phone registration request:', { name, phoneNumber, countryCode })

    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      )
    }

    // Format phone number first
    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode || 'US')
    console.log('📱 Formatted phone:', formattedPhone)

    // Then validate the formatted phone number
    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({ phoneNumber: formattedPhone })
    
    if (existingUser) {
      console.log('📱 Existing user found:', existingUser._id)
      
      // If user exists but is not verified, allow resending
      if (!existingUser.phoneVerified) {
        console.log('📱 User exists but not verified, allowing resend')
        
        // Update user info in case name changed
        await users.updateOne(
          { _id: existingUser._id },
          { 
            $set: { 
              name,
              updatedAt: new Date()
            }
          }
        )

        // Send new verification code
        console.log('📱 Sending verification code to existing user...')
        const verificationResult = await sendVerificationCode(formattedPhone)
        
        if (!verificationResult.success) {
          console.error('📱 SMS sending failed:', verificationResult.error)
          return NextResponse.json(
            { error: 'Failed to send verification code. Please try again.' },
            { status: 500 }
          )
        }

        console.log('📱 SMS sent successfully:', verificationResult.sid)

        // Store verification code if using basic SMS
        if (verificationResult.code) {
          await TokenManager.createToken(
            formattedPhone,
            'phone_verification',
            10, // 10 minutes
            existingUser._id.toString()
          )
        }

        return NextResponse.json(
          { 
            message: 'New verification code sent successfully',
            phoneNumber: formattedPhone,
            userId: existingUser._id,
            requiresVerification: true,
            isResend: true
          },
          { status: 200 }
        )
      } else {
        // User exists and is verified
        return NextResponse.json(
          { error: 'This phone number is already registered and verified. Please sign in instead.' },
          { status: 400 }
        )
      }
    }

    // Check for existing accounts to link before user creation
    console.log('🔍 Checking for existing accounts to link...')
    const linkingCandidates = await AccountLinkingService.findLinkingCandidates(
      undefined,  // no email
      formattedPhone,
      name
    )

    if (linkingCandidates.length > 0) {
      console.log(`🔗 Found ${linkingCandidates.length} potential accounts to link`)
      return NextResponse.json(
        { 
          requiresLinking: true,
          candidates: linkingCandidates,
          message: 'We found existing accounts that might be yours. Would you like to link them?',
          registrationData: { name, phoneNumber: formattedPhone, countryCode }
        },
        { status: 200 }
      )
    }

    // Create new user
    console.log('📱 Creating new user...')
    const defaultImage = generatePhoneAvatar(formattedPhone)

    const result = await users.insertOne({
      name,
      phoneNumber: formattedPhone,
      image: defaultImage,
      registerSource: 'phone',
      phoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      avatarType: 'default',
    })

    console.log('📱 User created:', result.insertedId)

    // Send verification code
    console.log('📱 Sending verification code...')
    const verificationResult = await sendVerificationCode(formattedPhone)
    
    if (!verificationResult.success) {
      console.error('📱 SMS sending failed, removing user:', verificationResult.error)
      // Remove the user if SMS failed
      await users.deleteOne({ _id: result.insertedId })
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    console.log('📱 SMS sent successfully:', verificationResult.sid)

    // Store verification code if using basic SMS
    if (verificationResult.code) {
      await TokenManager.createToken(
        formattedPhone,
        'phone_verification',
        10, // 10 minutes
        result.insertedId.toString()
      )
    }

    return NextResponse.json(
      { 
        message: 'Verification code sent successfully',
        phoneNumber: formattedPhone,
        userId: result.insertedId,
        requiresVerification: true
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('📱 Phone registration error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}