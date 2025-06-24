// src/app/api/user/account-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export interface AccountStatus {
  emailVerified: boolean
  phoneVerified: boolean
  socialAccounts: {
    count: number
    providers: string[]
    hasAny: boolean
  }
  twoFactorAuth: {
    enabled: boolean
    hasBackupCodes: boolean
  }
  securityScore: number
  lastSecurityUpdate?: Date
}

// GET method to fetch account status
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
          emailVerified: 1,
          phoneVerified: 1,
          linkedProviders: 1,
          twoFactorEnabled: 1,
          backupCodes: 1,
          verifiedEmails: 1,
          verifiedPhones: 1,
          linkedEmails: 1,
          linkedPhones: 1,
          email: 1,
          phoneNumber: 1,
          lastPasswordChange: 1,
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

    // Calculate email verification status
    const primaryEmailVerified = user.emailVerified || false
    const hasVerifiedEmails = user.verifiedEmails && user.verifiedEmails.length > 0
    const emailVerified = primaryEmailVerified || hasVerifiedEmails

    // Calculate phone verification status
    const primaryPhoneVerified = user.phoneVerified || false
    const hasVerifiedPhones = user.verifiedPhones && user.verifiedPhones.length > 0
    const phoneVerified = primaryPhoneVerified || hasVerifiedPhones

    // Calculate social accounts status
    const linkedProviders = user.linkedProviders || []
    const socialAccounts = {
      count: linkedProviders.length,
      providers: linkedProviders,
      hasAny: linkedProviders.length > 0
    }

    // Calculate two-factor auth status
    const twoFactorAuth = {
      enabled: user.twoFactorEnabled || false,
      hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0)
    }

    // Calculate security score (0-100)
    let securityScore = 0
    if (emailVerified) securityScore += 25
    if (phoneVerified) securityScore += 25
    if (socialAccounts.hasAny) securityScore += 15
    if (twoFactorAuth.enabled) securityScore += 35

    // Get last security update from security log
    const lastSecurityUpdate = user.securityLog && user.securityLog.length > 0
      ? user.securityLog[user.securityLog.length - 1].timestamp
      : null

    const accountStatus: AccountStatus = {
      emailVerified,
      phoneVerified,
      socialAccounts,
      twoFactorAuth,
      securityScore,
      lastSecurityUpdate
    }

    return NextResponse.json({
      success: true,
      status: accountStatus
    })

  } catch (error) {
    console.error('❌ Get account status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}