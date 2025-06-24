// src/app/api/user/social-accounts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export interface SocialAccount {
  provider: string
  providerId: string
  email?: string
  name?: string
  image?: string
  connectedAt: Date
  lastUsed?: Date
}

// GET method to get all connected social accounts
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
    const accounts = client.db().collection('accounts')
    
    // Get user's linked providers from user document
    const user = await users.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { linkedProviders: 1 } }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get detailed account information from accounts collection
    const userAccounts = await accounts.find({
      userId: session.user.id,
      type: 'oauth'
    }).toArray()

    const socialAccounts: SocialAccount[] = userAccounts.map(account => ({
      provider: account.provider,
      providerId: account.providerAccountId,
      email: account.email,
      name: account.name,
      image: account.image,
      connectedAt: account.createdAt || new Date(),
      lastUsed: account.lastUsed
    }))

    return NextResponse.json({
      success: true,
      accounts: socialAccounts,
      count: socialAccounts.length
    })

  } catch (error) {
    console.error('❌ Get social accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE method to disconnect a social account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { provider, password } = await req.json()

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
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
    const accounts = client.db().collection('accounts')
    
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

    // Check if user has other authentication methods
    const userAccounts = await accounts.find({
      userId: session.user.id
    }).toArray()

    const hasPassword = !!user.password
    const hasOtherOAuth = userAccounts.filter(acc => acc.provider !== provider).length > 0
    const hasVerifiedEmail = user.emailVerified
    const hasVerifiedPhone = user.phoneVerified

    if (!hasPassword && !hasOtherOAuth && !hasVerifiedEmail && !hasVerifiedPhone) {
      return NextResponse.json(
        { error: 'Cannot disconnect last authentication method. Please add another method first.' },
        { status: 400 }
      )
    }

    // Remove from accounts collection
    const deleteResult = await accounts.deleteOne({
      userId: session.user.id,
      provider: provider
    })

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Social account not found or already disconnected' },
        { status: 404 }
      )
    }

    // Update user's linkedProviders array
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $pull: { 
          linkedProviders: provider 
        },
        $push: { 
          securityLog: {
            event: 'social_account_disconnected',
            provider: provider,
            timestamp: new Date(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    console.log(`✅ Social account disconnected: ${provider} for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: `${provider} account disconnected successfully`
    })

  } catch (error) {
    console.error('❌ Disconnect social account error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}