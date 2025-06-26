// src/app/api/debug/2fa-status/route.ts - Create this file for debugging
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import speakeasy from 'speakeasy'

export async function GET(req: NextRequest) {
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
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Test current time-based code generation
    let currentCode = null
    if (user.twoFactorSecret) {
      currentCode = speakeasy.totp({
        secret: user.twoFactorSecret,
        encoding: 'base32'
      })
    }

    const debugInfo = {
      userId: user._id,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      hasTwoFactorSecret: !!user.twoFactorSecret,
      hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0),
      backupCodesCount: user.backupCodes?.length || 0,
      backupCodes: user.backupCodes || [], // Show actual codes for debugging
      currentServerTime: new Date().toISOString(),
      currentGeneratedCode: currentCode, // What the server would generate right now
      twoFactorSecretLength: user.twoFactorSecret?.length || 0,
      tempSecretExists: !!user.tempTwoFactorSecret
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo
    })

  } catch (error) {
    console.error('❌ Debug 2FA status error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST method to test a specific code
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { testCode } = await req.json()

    if (!testCode) {
      return NextResponse.json(
        { error: 'Test code is required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'User not found or 2FA not enabled' },
        { status: 404 }
      )
    }

    // Test the provided code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: testCode,
      window: 2
    })

    // Check if it's a backup code
    const isBackupCode = user.backupCodes && user.backupCodes.includes(testCode.toUpperCase())

    return NextResponse.json({
      success: true,
      testCode,
      totpVerified: verified,
      isBackupCode,
      result: verified || isBackupCode ? 'VALID' : 'INVALID'
    })

  } catch (error) {
    console.error('❌ Test 2FA code error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}