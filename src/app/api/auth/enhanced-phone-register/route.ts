import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'
import { sendVerificationCode } from '@/lib/sms'
import { TokenManager } from '@/lib/tokens'

// Phone formatting function
function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
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

// Validate phone number format
function validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+[1-9]\d{6,14}$/
  return phoneRegex.test(phoneNumber)
}

function generatePhoneAvatar(phoneNumber: string): string {
  const last4 = phoneNumber.slice(-4)
  const colors = [
    '3B82F6', '10B981', 'F59E0B', 'EF4444', 
    '8B5CF6', '06B6D4', 'F97316', 'EC4899',
    '14B8A6', 'F472B6', '8B5CF6', 'F59E0B'
  ]
  const colorIndex = parseInt(last4, 10) % colors.length
  const backgroundColor = colors[colorIndex]
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent('📱')}&background=${backgroundColor}&color=ffffff&size=200&bold=true`
}

export async function POST(req: NextRequest) {
  try {
    const { name, phoneNumber, countryCode } = await req.json()

    console.log('📱 Enhanced phone registration request:', { name, phoneNumber, countryCode })

    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Name and phone number are required' },
        { status: 400 }
      )
    }

    if (name.length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode || 'US')
    
    if (!validatePhoneNumber(formattedPhone)) {
      console.error('📱 Invalid phone format:', formattedPhone)
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    console.log('📱 Formatted phone:', formattedPhone)

    // Check if phone number already exists
    const existingUser = await EnhancedAuthIntegration.authenticateUserWithGroup({
      phoneNumber: formattedPhone
    })

    if (existingUser?.user) {
      console.log('📱 Existing user found:', existingUser.user._id)
      
      // If user exists but is not verified, allow resending
      if (!existingUser.user.phoneVerified) {
        console.log('📱 User exists but not verified, updating and resending...')
        
        // Update user info in case name changed
        const client = await clientPromise
        const users = client.db().collection('users')
        
        await users.updateOne(
          { _id: existingUser.user._id },
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

        // Store verification code if using basic SMS
        if (verificationResult.code) {
          await TokenManager.createToken(
            formattedPhone,
            'phone_verification',
            10, // 10 minutes
            existingUser.user._id.toString()
          )
        }

        return NextResponse.json(
          { 
            message: 'New verification code sent successfully',
            phoneNumber: formattedPhone,
            userId: existingUser.user._id.toString(),
            requiresVerification: true,
            isResend: true
          },
          { status: 200 }
        )
      } else {
        // User exists and is verified
        return NextResponse.json(
          { error: 'This phone number is already registered and verified. Please sign in instead.' },
          { status: 409 }
        )
      }
    }

    const defaultImage = generatePhoneAvatar(formattedPhone)

    console.log('🔗 Creating user with enhanced linking check...')

    // Create user with enhanced linking
    const result = await EnhancedAuthIntegration.createUserWithLinkingCheck({
      name,
      phoneNumber: formattedPhone,
      image: defaultImage,
      registerSource: 'phone',
      avatarType: 'default',
      phoneVerified: false
    })

    if (!result.success) {
      console.error('❌ User creation failed:', result)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    console.log(`✅ User created successfully:`, {
      userId: result.userId,
      autoLinked: result.autoLinked,
      groupId: result.groupId
    })

    // Send verification code
    console.log('📱 Sending verification code...')
    const verificationResult = await sendVerificationCode(formattedPhone)
    
    if (!verificationResult.success) {
      console.error('📱 SMS sending failed, cleaning up user:', verificationResult.error)
      
      // Clean up the created user if SMS failed
      try {
        const client = await clientPromise
        const users = client.db().collection('users')
        await users.deleteOne({ _id: new ObjectId(result.userId) })
        console.log('🧹 Cleaned up user after SMS failure')
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup user:', cleanupError)
      }
      
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again.' },
        { status: 500 }
      )
    }

    console.log('📱 SMS sent successfully:', verificationResult.sid)

    // Store verification code if using basic SMS (not Twilio Verify)
    if (verificationResult.code) {
      await TokenManager.createToken(
        formattedPhone,
        'phone_verification',
        10, // 10 minutes
        result.userId
      )
    }

    // Prepare response
    const response = {
      success: true,
      message: result.autoLinked 
        ? 'Phone registered and automatically linked with your existing accounts! Please verify your phone number.'
        : 'Verification code sent successfully',
      phoneNumber: formattedPhone,
      userId: result.userId,
      requiresVerification: true,
      autoLinked: result.autoLinked,
      groupId: result.groupId,
      linkingSuggestion: result.linkingSuggestion,
      verificationSid: verificationResult.sid,
      // Only include in development
      verificationCode: process.env.NODE_ENV === 'development' ? verificationResult.code : undefined
    }

    // Add linking suggestion details if available
    if (result.linkingSuggestion && result.linkingSuggestion.shouldSuggest) {
      response.linkingSuggestion = {
        shouldSuggest: result.linkingSuggestion.shouldSuggest,
        confidence: result.linkingSuggestion.confidence,
        candidatesCount: result.linkingSuggestion.candidates.length,
        highConfidenceCandidates: result.linkingSuggestion.candidates.filter(c => c.confidence >= 90).length
      }
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('❌ Enhanced phone registration error:', error)
    
    // Handle specific error types
    if (error.message?.includes('duplicate key') || error.message?.includes('E11000')) {
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// GET method to check if phone number is available
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const phoneNumber = searchParams.get('phoneNumber')
    const countryCode = searchParams.get('countryCode') || 'US'

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number parameter is required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber, countryCode)
    
    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { 
          available: false,
          error: 'Invalid phone number format',
          formattedPhone 
        },
        { status: 400 }
      )
    }

    // Check if phone exists using enhanced service
    const existingUser = await EnhancedAuthIntegration.authenticateUserWithGroup({ 
      phoneNumber: formattedPhone 
    })

    return NextResponse.json({
      available: !existingUser?.user,
      phoneNumber: formattedPhone,
      hasLinkedAccounts: existingUser?.hasLinkedAccounts || false,
      phoneVerified: existingUser?.user?.phoneVerified || false,
      registerSource: existingUser?.user?.registerSource || null
    })

  } catch (error) {
    console.error('❌ Phone availability check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to resend verification code
export async function PUT(req: NextRequest) {
  try {
    const { phoneNumber, userId } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log('📱 Resending verification code for:', phoneNumber)

    // Verify user exists and owns this phone number
    if (userId) {
      const client = await clientPromise
      const users = client.db().collection('users')
      const user = await users.findOne({ 
        _id: new ObjectId(userId),
        phoneNumber: phoneNumber
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found or phone number mismatch' },
          { status: 404 }
        )
      }

      if (user.phoneVerified) {
        return NextResponse.json(
          { error: 'Phone number is already verified' },
          { status: 409 }
        )
      }
    }

    // Send verification code
    const verificationResult = await sendVerificationCode(phoneNumber)
    
    if (!verificationResult.success) {
      console.error('📱 Resend SMS failed:', verificationResult.error)
      return NextResponse.json(
        { error: 'Failed to resend verification code. Please try again.' },
        { status: 500 }
      )
    }

    // Store verification code if using basic SMS
    if (verificationResult.code && userId) {
      await TokenManager.createToken(
        phoneNumber,
        'phone_verification',
        10, // 10 minutes
        userId
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully',
      phoneNumber,
      verificationSid: verificationResult.sid,
      // Only include in development
      verificationCode: process.env.NODE_ENV === 'development' ? verificationResult.code : undefined
    })

  } catch (error) {
    console.error('❌ Resend verification code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}