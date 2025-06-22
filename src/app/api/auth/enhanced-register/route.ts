import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'
import { sendEmail, emailTemplates } from '@/lib/email'
import { TokenManager } from '@/lib/tokens'

// Function to generate default avatar URL
function generateDefaultAvatar(name: string, email: string): string {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
  
  const colors = [
    '3B82F6', '10B981', 'F59E0B', 'EF4444', 
    '8B5CF6', '06B6D4', 'F97316', 'EC4899'
  ]
  
  const colorIndex = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const backgroundColor = colors[colorIndex]
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=ffffff&size=200&bold=true`
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    console.log('🔐 Enhanced registration request:', { name, email })

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    const defaultImage = generateDefaultAvatar(name, email)

    console.log('🔗 Creating user with enhanced linking check...')

    // Create user with enhanced linking
    const result = await EnhancedAuthIntegration.createUserWithLinkingCheck({
      name,
      email,
      password: hashedPassword,
      image: defaultImage,
      registerSource: 'credentials',
      avatarType: 'default',
      linkedProviders: []
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

    // Generate verification token
    const verificationToken = await TokenManager.createToken(
      email,
      'email_verification',
      24 * 60, // 24 hours in minutes
      result.userId
    )

    // Send verification email
    let emailSent = false
    let emailError = null

    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
      const emailTemplate = emailTemplates.verificationEmail(name, verificationUrl)
      
      const emailResult = await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      })

      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
        console.warn('⚠️ Email sending failed:', emailResult.error)
      }
    } catch (error) {
      console.warn('⚠️ Email sending failed:', error)
      emailError = error.message
    }

    // Prepare response
    const response = {
      success: true,
      message: result.autoLinked 
        ? 'Account created and automatically linked with your existing accounts! Please check your email to verify your account.'
        : 'Account created successfully. Please check your email to verify your account.',
      userId: result.userId,
      requiresVerification: true,
      autoLinked: result.autoLinked,
      groupId: result.groupId,
      linkingSuggestion: result.linkingSuggestion,
      emailSent,
      emailError: emailError || undefined,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined // Only in dev
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
    console.error('❌ Enhanced registration error:', error)
    
    // Handle specific error types
    if (error.message?.includes('duplicate key') || error.message?.includes('E11000')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
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

// GET method to check if email is available
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Check if email exists using enhanced service
    const existingUser = await EnhancedAuthIntegration.authenticateUserWithGroup({ email })

    return NextResponse.json({
      available: !existingUser?.user,
      email,
      hasLinkedAccounts: existingUser?.hasLinkedAccounts || false,
      registerSource: existingUser?.user?.registerSource || null
    })

  } catch (error) {
    console.error('❌ Email availability check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
