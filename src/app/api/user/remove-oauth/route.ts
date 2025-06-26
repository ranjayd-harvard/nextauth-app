// src/app/api/user/remove-oauth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { provider } = await req.json()

    if (!provider) {
      return NextResponse.json(
        { error: 'OAuth provider is required' },
        { status: 400 }
      )
    }

    console.log('🌐 Remove OAuth provider request for user:', session.user.id, { provider })

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

    // Check if user has other verified authentication methods
    const hasOtherMethods = user.emailVerified || 
                           user.phoneVerified ||
                           (user.verifiedEmails && user.verifiedEmails.length > 0) ||
                           (user.verifiedPhones && user.verifiedPhones.length > 0) ||
                           (user.linkedProviders && user.linkedProviders.length > 1) ||
                           user.password // Has password for credentials login

    if (!hasOtherMethods) {
      return NextResponse.json(
        { error: 'Cannot remove OAuth provider. You must have at least one other verified authentication method.' },
        { status: 400 }
      )
    }

    // Check if provider exists in linkedProviders
    const providerExists = user.linkedProviders && user.linkedProviders.includes(provider.toLowerCase())

    if (!providerExists) {
      return NextResponse.json(
        { error: `${provider} provider not found in your linked accounts` },
        { status: 404 }
      )
    }

    console.log('🌐 Removing OAuth provider from user account...')

    // Remove provider from linkedProviders array
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $pull: { 
          linkedProviders: provider.toLowerCase()
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('🌐 Failed to remove OAuth provider from user')
      return NextResponse.json(
        { error: 'Failed to remove OAuth provider from account' },
        { status: 500 }
      )
    }

    // Also remove from NextAuth accounts table if it exists
    try {
      const accounts = client.db().collection('accounts')
      await accounts.deleteMany({
        userId: session.user.id,
        provider: provider.toLowerCase()
      })
      console.log('🌐 Removed OAuth provider from accounts table')
    } catch (accountError) {
      console.warn('⚠️ Could not remove from accounts table:', accountError)
      // Don't fail the request if this fails
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: 'oauth_provider_removed',
            timestamp: new Date(),
            provider: provider.toLowerCase(),
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log('🌐 OAuth provider removed successfully:', provider)

    return NextResponse.json(
      { 
        success: true,
        message: `${provider} account disconnected successfully`,
        provider: provider.toLowerCase()
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Remove OAuth provider error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}