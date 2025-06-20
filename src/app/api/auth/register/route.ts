import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import clientPromise from '@/lib/db'
import { sendEmail, emailTemplates } from '@/lib/email'
import { TokenManager } from '@/lib/tokens'
import { AccountLinkingService } from '@/lib/account-linking'

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

    const client = await clientPromise
    const users = client.db().collection('users')

    // Check if user already exists
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      if (existingUser.registerSource && existingUser.registerSource !== 'credentials') {
        return NextResponse.json(
          { error: `This email is already registered with ${existingUser.registerSource}. Please sign in using ${existingUser.registerSource} or use a different email.` },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)
    const defaultImage = generateDefaultAvatar(name, email)

    console.log('🔍 Checking for existing accounts to link...')
    const linkingCandidates = await AccountLinkingService.findLinkingCandidates(
      email,
      undefined,
      name
    )

    if (linkingCandidates.length > 0) {
      console.log(`🔗 Found ${linkingCandidates.length} potential accounts to link`)
      return NextResponse.json(
        { 
          requiresLinking: true,
          candidates: linkingCandidates,
          message: 'We found existing accounts that might be yours. Would you like to link them?',
          registrationData: { name, email, password } // Store for later
        },
        { status: 200 }
      )
    }

    // Create user (unverified initially)
    const result = await users.insertOne({
      name,
      email,
      password: hashedPassword,
      image: defaultImage,
      registerSource: 'credentials',
      emailVerified: false, // Add email verification status
      createdAt: new Date(),
      updatedAt: new Date(),
      linkedProviders: [],
      avatarType: 'default',
    })

    // Generate verification token
    const verificationToken = await TokenManager.createToken(
      email,                           // identifier (email)
      'email_verification',           // type
      24 * 60,                       // 24 hours in minutes (not hours!)
      result.insertedId.toString()    // userId
    )

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`
    const emailTemplate = emailTemplates.verificationEmail(name, verificationUrl)
    
    const emailResult = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    })

    if (emailResult.success) {
      return NextResponse.json(
        { 
          message: 'User created successfully. Please check your email to verify your account.',
          userId: result.insertedId,
          requiresVerification: true
        },
        { status: 201 }
      )
    } else {
      // If email fails, still return success but mention email issue
      return NextResponse.json(
        { 
          message: 'User created successfully, but verification email could not be sent. You can request a new verification email later.',
          userId: result.insertedId,
          requiresVerification: true,
          emailError: true
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
