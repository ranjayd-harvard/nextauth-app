// src/app/api/user/backup-codes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

// GET method to get remaining backup codes count
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
      { projection: { backupCodes: 1, twoFactorEnabled: 1 } }
    )
    
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

    const remainingCodes = user.backupCodes?.length || 0

    return NextResponse.json({
      success: true,
      remainingCodes,
      hasBackupCodes: remainingCodes > 0
    })

  } catch (error) {
    console.error('❌ Get backup codes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST method to regenerate backup codes
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
        { error: '2FA is not enabled' },
        { status: 400 }
      )
    }

    // Verify password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        )
      }
    }

    // Generate new backup codes
    const newBackupCodes = []
    for (let i = 0; i < 10; i++) {
      newBackupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }

    // Update backup codes in database
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          backupCodes: newBackupCodes,
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to regenerate backup codes' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: 'backup_codes_regenerated',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log(`✅ Backup codes regenerated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes: newBackupCodes
    })

  } catch (error) {
    console.error('❌ Regenerate backup codes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH method to use a backup code (called during login)
export async function PATCH(req: NextRequest) {
  try {
    const { email, backupCode } = await req.json()

    if (!email || !backupCode) {
      return NextResponse.json(
        { error: 'Email and backup code are required' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const user = await users.findOne({ email })
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      )
    }

    if (!user.twoFactorEnabled || !user.backupCodes) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      )
    }

    // Check if backup code exists and is valid
    const codeIndex = user.backupCodes.indexOf(backupCode.toUpperCase())
    
    if (codeIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 400 }
      )
    }

    // Remove the used backup code
    const updatedBackupCodes = [...user.backupCodes]
    updatedBackupCodes.splice(codeIndex, 1)

    const updateResult = await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          backupCodes: updatedBackupCodes,
          lastSignIn: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to process backup code' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: user._id },
      { 
        $push: { 
          securityLog: {
            event: 'backup_code_used',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown',
            remainingCodes: updatedBackupCodes.length
          }
        }
      }
    )

    console.log(`✅ Backup code used for user: ${user._id}, remaining: ${updatedBackupCodes.length}`)

    return NextResponse.json({
      success: true,
      message: 'Backup code accepted',
      remainingCodes: updatedBackupCodes.length,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        image: user.image
      }
    })

  } catch (error) {
    console.error('❌ Use backup code error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}