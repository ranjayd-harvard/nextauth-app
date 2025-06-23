// src/app/api/user/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'

interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword, confirmPassword }: ChangePasswordRequest = await req.json()

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All password fields are required' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'New passwords do not match' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Password strength validation
    const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    if (!passwordStrengthRegex.test(newPassword)) {
      return NextResponse.json(
        { error: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character' },
        { status: 400 }
      )
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Get current user
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has a password (not OAuth-only account)
    if (!user.password) {
      return NextResponse.json(
        { error: 'This account was created with OAuth. Please set up a password first.' },
        { status: 400 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const saltRounds = 12
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password in database
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          password: hashedNewPassword,
          lastPasswordChange: new Date(),
          passwordChangeRequired: false,
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: 'password_changed',
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log(`✅ Password changed successfully for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('❌ Change password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}