// src/app/api/user/complete-profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`👤 Getting complete profile for user: ${session.user.id}`)

    const profile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
    
    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Transform the profile data for frontend consumption
    const transformedProfile = {
      user: {
        id: profile.user._id.toString(),
        name: profile.user.name,
        email: profile.user.email || profile.user.primaryEmail,
        phoneNumber: profile.user.phoneNumber || profile.user.primaryPhone,
        image: profile.user.image,
        registerSource: profile.user.registerSource,
        avatarType: profile.user.avatarType,
        
        // Linked identifiers
        linkedEmails: profile.user.linkedEmails || [],
        linkedPhones: profile.user.linkedPhones || [],
        linkedProviders: profile.user.linkedProviders || [],
        
        // Verification status
        emailVerified: profile.user.emailVerified || false,
        phoneVerified: profile.user.phoneVerified || false,
        
        // Account metadata
        accountStatus: profile.user.accountStatus || 'active',
        isMaster: profile.user.isMaster || false,
        isActive: profile.user.isActive !== false, // Default to true if not set
        
        // Timestamps
        createdAt: profile.user.createdAt,
        updatedAt: profile.user.updatedAt,
        lastSignIn: profile.user.lastSignIn,
        emailVerifiedAt: profile.user.emailVerifiedAt,
        phoneVerifiedAt: profile.user.phoneVerifiedAt,
        
        // Group information
        groupId: profile.user.groupId,
        groupCreatedAt: profile.user.groupCreatedAt,
        lastMergeAt: profile.user.lastMergeAt,
        mergedAccounts: profile.user.mergedAccounts || []
      },
      
      // Available authentication methods
      authMethods: profile.authMethods,
      
      // Linked accounts in the same group
      linkedAccounts: profile.linkedAccounts.map(account => ({
        id: account._id.toString(),
        name: account.name,
        email: account.email,
        phoneNumber: account.phoneNumber,
        authMethods: account.authMethods,
        isActive: account.isActive,
        isMaster: account.isMaster,
        createdAt: account.createdAt,
        lastSignIn: account.lastSignIn
      })),
      
      // Group information
      groupInfo: profile.groupInfo ? {
        groupId: profile.groupInfo.groupId,
        isMaster: profile.groupInfo.isMaster,
        totalAccounts: profile.groupInfo.totalAccounts,
        activeAccounts: profile.groupInfo.activeAccounts,
        mergedAccounts: profile.groupInfo.totalAccounts - profile.groupInfo.activeAccounts
      } : null,
      
      // Profile statistics
      stats: {
        totalEmails: (profile.user.linkedEmails || []).length,
        totalPhones: (profile.user.linkedPhones || []).length,
        totalProviders: (profile.user.linkedProviders || []).length,
        totalAuthMethods: profile.authMethods.length,
        accountAge: profile.user.createdAt ? 
          Math.floor((Date.now() - new Date(profile.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        daysSinceLastSignIn: profile.user.lastSignIn ?
          Math.floor((Date.now() - new Date(profile.user.lastSignIn).getTime()) / (1000 * 60 * 60 * 24)) : null,
        hasLinkedAccounts: profile.linkedAccounts.length > 1,
        isGroupMaster: profile.groupInfo?.isMaster || false
      }
    }

    console.log(`✅ Profile retrieved successfully:`, {
      userId: transformedProfile.user.id,
      groupId: transformedProfile.user.groupId,
      linkedAccounts: transformedProfile.linkedAccounts.length,
      authMethods: transformedProfile.authMethods.length
    })

    return NextResponse.json({
      success: true,
      profile: transformedProfile,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Get complete profile error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PUT method to update user profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name, image, avatarType } = await req.json()

    if (!name && !image && !avatarType) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      )
    }

    console.log(`👤 Updating profile for user: ${session.user.id}`)

    // Get current profile to verify user exists
    const currentProfile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
    
    if (!currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    if (name && name.trim().length >= 2) {
      updateData.name = name.trim()
    }

    if (image) {
      updateData.image = image
    }

    if (avatarType && ['default', 'oauth', 'uploaded'].includes(avatarType)) {
      updateData.avatarType = avatarType
    }

    // Update the user in database
    const client = await clientPromise
    const users = client.db().collection('users')
    
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

    // If user is part of a group, update group activity
    if (currentProfile.user.groupId) {
      await users.updateMany(
        { groupId: currentProfile.user.groupId },
        { 
          $set: { 
            groupLastActivity: new Date()
          }
        }
      )
    }

    // Get updated profile
    const updatedProfile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)

    console.log(`✅ Profile updated successfully for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updatedFields: Object.keys(updateData),
      profile: updatedProfile ? {
        user: {
          id: updatedProfile.user._id.toString(),
          name: updatedProfile.user.name,
          email: updatedProfile.user.email || updatedProfile.user.primaryEmail,
          phoneNumber: updatedProfile.user.phoneNumber || updatedProfile.user.primaryPhone,
          image: updatedProfile.user.image,
          avatarType: updatedProfile.user.avatarType,
          updatedAt: updatedProfile.user.updatedAt
        }
      } : null
    })

  } catch (error) {
    console.error('❌ Update profile error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// POST method to refresh/sync profile data
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { action = 'refresh' } = await req.json()

    console.log(`👤 Profile action '${action}' for user: ${session.user.id}`)

    switch (action) {
      case 'refresh':
        // Update last activity and get fresh profile
        await EnhancedAuthIntegration.updateUserActivity(session.user.id)
        const profile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
        
        return NextResponse.json({
          success: true,
          message: 'Profile refreshed successfully',
          profile,
          refreshedAt: new Date().toISOString()
        })

      case 'sync-group':
        // Sync group information if user belongs to a group
        const userProfile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
        
        if (!userProfile?.user.groupId) {
          return NextResponse.json({
            success: false,
            message: 'User is not part of any group'
          })
        }

        // Get fresh group accounts
        const { EnhancedAccountLinkingService } = await import('@/lib/enhanced-account-linking')
        const groupAccounts = await EnhancedAccountLinkingService.getGroupAccounts(userProfile.user.groupId)

        return NextResponse.json({
          success: true,
          message: 'Group information synchronized',
          groupAccounts,
          syncedAt: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('❌ Profile action error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE method to deactivate account (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { confirmDelete, transferGroupOwnership } = await req.json()

    if (!confirmDelete) {
      return NextResponse.json(
        { error: 'Account deletion must be confirmed' },
        { status: 400 }
      )
    }

    console.log(`⚠️ Account deletion request for user: ${session.user.id}`)

    // Get current profile to check group status
    const currentProfile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
    
    if (!currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')

    // Check if user is a group master with other active accounts
    if (currentProfile.groupInfo?.isMaster && currentProfile.groupInfo.activeAccounts > 1) {
      if (!transferGroupOwnership) {
        return NextResponse.json({
          error: 'Cannot delete master account with linked accounts',
          requiresGroupTransfer: true,
          activeAccounts: currentProfile.groupInfo.activeAccounts,
          linkedAccounts: currentProfile.linkedAccounts.filter(a => a.isActive && a._id.toString() !== session.user.id)
        }, { status: 409 })
      }

      // Transfer group ownership to another active account
      const otherActiveAccount = currentProfile.linkedAccounts.find(
        a => a.isActive && a._id.toString() !== session.user.id
      )

      if (otherActiveAccount) {
        await users.updateOne(
          { _id: otherActiveAccount._id },
          { 
            $set: { 
              isMaster: true,
              updatedAt: new Date()
            }
          }
        )
        console.log(`👑 Transferred group ownership to: ${otherActiveAccount._id}`)
      }
    }

    // Soft delete the account
    const deleteResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: {
          accountStatus: 'deactivated',
          isActive: false,
          isMaster: false,
          deactivatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    if (deleteResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Account deactivated successfully: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Account has been deactivated successfully',
      deactivatedAt: new Date().toISOString(),
      groupOwnershipTransferred: !!transferGroupOwnership
    })

  } catch (error) {
    console.error('❌ Account deletion error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}