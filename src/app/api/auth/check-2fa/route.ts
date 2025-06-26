// src/app/api/auth/check-2fa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'

// POST method to check if user has 2FA enabled (for login flow)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Use enhanced authentication to find user with group support
    const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
      email
    })
    
    if (!authResult?.user) {
      // Don't reveal whether user exists for security
      return NextResponse.json({
        success: true,
        requires2FA: false,
        exists: false
      })
    }

    const user = authResult.user

    // Check if user registered with OAuth but trying to sign in with credentials
    if (!user.password && user.registerSource !== 'credentials') {
      return NextResponse.json({
        success: false,
        error: `This email is registered with ${user.registerSource}. Please use ${user.registerSource} to sign in.`,
        requiresOAuth: true,
        provider: user.registerSource
      })
    }

    return NextResponse.json({
      success: true,
      requires2FA: user.twoFactorEnabled || false,
      exists: true,
      hasPassword: !!user.password
    })

  } catch (error) {
    console.error('❌ Check 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}