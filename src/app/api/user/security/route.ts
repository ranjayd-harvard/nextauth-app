// src/app/api/user/security/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

// GET method to fetch security settings
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
          twoFactorSecret: 1,
          backupCodes: 1,
          loginNotifications: 1,
          passwordChangeRequired: 1,
          lastPasswordChange: 1,
          sessionTimeout: 1,
          trustedDevices: 1
        } 
      }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const securityInfo = {
      twoFactorEnabled: user.twoFactorEnabled || false,
      hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0),
      loginNotifications: user.loginNotifications !== false, // default true
      passwordChangeRequired: user.passwordChangeRequired || false,
      lastPasswordChange: user.lastPasswordChange || null,
      sessionTimeout: user.sessionTimeout || 30,
      trustedDevicesCount: user.trustedDevices?.length || 0
    }

    return NextResponse.json({
      success: true,
      security: securityInfo
    })

  } catch (error) {
    console.error('❌ Get security settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to update security settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { 
      loginNotifications, 
      sessionTimeout, 
      passwordChangeRequired 
    } = await req.json()

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateData: any = {
      updatedAt: new Date()
    }

    if (typeof loginNotifications === 'boolean') {
      updateData.loginNotifications = loginNotifications
    }

    if (typeof sessionTimeout === 'number' && sessionTimeout >= -1) {
      updateData.sessionTimeout = sessionTimeout
    }

    if (typeof passwordChangeRequired === 'boolean') {
      updateData.passwordChangeRequired = passwordChangeRequired
    }

    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Security settings updated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully'
    })

  } catch (error) {
    console.error('❌ Update security settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}