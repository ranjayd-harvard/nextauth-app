// src/app/api/debug/2fa-check/route.ts - Simple debug without auth requirement
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/db'
import speakeasy from 'speakeasy'

export async function POST(req: NextRequest) {
  try {
    const { email, testCode } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required for debugging' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ email })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const debugInfo = {
      userId: user._id,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      hasTwoFactorSecret: !!user.twoFactorSecret,
      twoFactorSecretLength: user.twoFactorSecret?.length || 0,
      hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0),
      backupCodesCount: user.backupCodes?.length || 0,
      backupCodes: user.backupCodes || [],
      tempSecretExists: !!user.tempTwoFactorSecret,
      currentServerTime: new Date().toISOString(),
      registerSource: user.registerSource
    }

    // If a test code is provided, test it
    let testResult = null
    if (testCode && user.twoFactorSecret) {
      // Generate current server code for comparison
      const currentServerCode = speakeasy.totp({
        secret: user.twoFactorSecret,
        encoding: 'base32'
      })

      // Test the provided code
      const totpVerified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: testCode,
        window: 2 // Allow 2 time windows (60 seconds before/after)
      })

      // Check if it's a backup code
      const isBackupCode = user.backupCodes && user.backupCodes.includes(testCode.toUpperCase())

      testResult = {
        providedCode: testCode,
        currentServerCode,
        totpVerified,
        isBackupCode,
        isValid: totpVerified || isBackupCode,
        timeWindow: new Date().getTime() / 1000 / 30 // Current TOTP time window
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      test: testResult
    })

  } catch (error) {
    console.error('❌ Debug 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}