// src/app/api/user/two-factor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import crypto from 'crypto'

// GET method to get 2FA setup information
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

    // If 2FA is already enabled, return status
    if (user.twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        enabled: true,
        hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0)
      })
    }

    // Generate new secret for setup
    const secret = speakeasy.generateSecret({
      name: `${process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', '') || 'App'} (${user.email || user.name})`,
      issuer: process.env.NEXTAUTH_URL?.replace('https://', '').replace('http://', '') || 'Your App'
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

    // Store temporary secret (not yet enabled)
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          tempTwoFactorSecret: secret.base32,
          updatedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      enabled: false,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    })

  } catch (error) {
    console.error('❌ Get 2FA setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST method to enable 2FA
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { token, password } = await req.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
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

    // Verify password
    if (user.password) {
      const bcrypt = require('bcryptjs')
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        )
      }
    }

    // Check if user has temporary secret
    if (!user.tempTwoFactorSecret) {
      return NextResponse.json(
        { error: 'No 2FA setup in progress. Please start setup first.' },
        { status: 400 }
      )
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2
    })

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Generate backup codes
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }

    // Enable 2FA
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          twoFactorEnabled: true,
          twoFactorSecret: user.tempTwoFactorSecret,
          backupCodes: backupCodes,
          updatedAt: new Date()
        },
        $unset: {
          tempTwoFactorSecret: ""
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: '2fa_enabled',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log(`✅ 2FA enabled for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: backupCodes
    })

  } catch (error) {
    console.error('❌ Enable 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE method to disable 2FA
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { password, token } = await req.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 }
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

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify password
    if (user.password) {
      const bcrypt = require('bcryptjs')
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        )
      }
    }

    // If token provided, verify it (additional security)
    if (token) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      })

      if (!verified) {
        return NextResponse.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        )
      }
    }

    // Disable 2FA
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          twoFactorEnabled: false,
          updatedAt: new Date()
        },
        $unset: {
          twoFactorSecret: "",
          backupCodes: ""
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: '2fa_disabled',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log(`✅ 2FA disabled for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully'
    })

  } catch (error) {
    console.error('❌ Disable 2FA error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}