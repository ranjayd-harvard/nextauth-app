// src/app/api/user/two-factor/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

// GET method to get detailed 2FA status
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
    
    const user = await users.findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          twoFactorEnabled: 1,
          backupCodes: 1,
          tempTwoFactorSecret: 1,
          securityLog: 1
        }
      }
    )
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find 2FA related security events
    const twoFactorEvents = user.securityLog?.filter(log => 
      log.event === '2fa_enabled' || 
      log.event === '2fa_disabled' || 
      log.event === '2fa_backup_codes_generated'
    ) || []

    const status = {
      enabled: user.twoFactorEnabled || false,
      hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0),
      backupCodesCount: user.backupCodes?.length || 0,
      setupInProgress: !!user.tempTwoFactorSecret,
      lastEnabledAt: twoFactorEvents.find(e => e.event === '2fa_enabled')?.timestamp || null,
      lastDisabledAt: twoFactorEvents.find(e => e.event === '2fa_disabled')?.timestamp || null
    }

    return NextResponse.json({
      success: true,
      status
    })

  } catch (error) {
    console.error('❌ Get 2FA status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST method to generate new backup codes
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { password } = await req.json()

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
        { error: '2FA must be enabled first' },
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

    // Generate new backup codes
    const crypto = require('crypto')
    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }

    // Update user with new backup codes
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          backupCodes: backupCodes,
          updatedAt: new Date()
        },
        $push: { 
          securityLog: {
            event: '2fa_backup_codes_generated',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to generate backup codes' },
        { status: 500 }
      )
    }

    console.log(`✅ New backup codes generated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'New backup codes generated successfully',
      backupCodes: backupCodes
    })

  } catch (error) {
    console.error('❌ Generate backup codes error:', error)
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

    const { password } = await req.json()

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

    // Disable 2FA and remove secrets
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          twoFactorEnabled: false,
          updatedAt: new Date()
        },
        $unset: {
          twoFactorSecret: "",
          backupCodes: "",
          tempTwoFactorSecret: ""
        },
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

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to disable 2FA' },
        { status: 500 }
      )
    }

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