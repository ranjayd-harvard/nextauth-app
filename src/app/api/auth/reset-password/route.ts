import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { TokenManager } from '@/lib/tokens'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Verify the reset token
    const verificationResult = await TokenManager.verifyToken(token, 'password_reset')
    
    if (!verificationResult.valid) {
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user's password
    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateResult = await users.updateOne(
      { _id: new ObjectId(verificationResult.userId) },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date(),
          passwordResetAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset successfully!' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
