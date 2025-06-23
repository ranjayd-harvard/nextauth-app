// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'

interface ProfileUpdateData {
  name?: string
  bio?: string
  location?: string
  website?: string
  timezone?: string
  image?: string
  avatarType?: 'default' | 'oauth' | 'uploaded'
  phoneNumber?: string
}

// GET method to fetch detailed user profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const profile = await EnhancedAuthIntegration.getUserCompleteProfile(session.user.id)
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Ensure all required fields exist with defaults
    const enrichedProfile = {
      ...profile,
      authMethods: profile.authMethods || [],
      stats: {
        accountAge: profile.stats?.accountAge || 0,
        totalAuthMethods: profile.stats?.totalAuthMethods || 0,
        hasLinkedAccounts: profile.stats?.hasLinkedAccounts || false,
        ...profile.stats
      },
      groupInfo: profile.groupInfo || null
    }

    return NextResponse.json({
      success: true,
      profile: enrichedProfile
    })

  } catch (error) {
    console.error('❌ Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to update user profile with extended fields
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const profileData: ProfileUpdateData = await req.json()

    // Validate required fields
    if (Object.keys(profileData).length === 0) {
      return NextResponse.json(
        { error: 'At least one field to update is required' },
        { status: 400 }
      )
    }

    // Validate individual fields
    if (profileData.name && profileData.name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (profileData.website && profileData.website.trim()) {
      const urlRegex = /^https?:\/\/.+/
      if (!urlRegex.test(profileData.website)) {
        return NextResponse.json(
          { error: 'Website must be a valid URL starting with http:// or https://' },
          { status: 400 }
        )
      }
    }

    if (profileData.bio && profileData.bio.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      )
    }

    if (profileData.avatarType && !['default', 'oauth', 'uploaded'].includes(profileData.avatarType)) {
      return NextResponse.json(
        { error: 'Invalid avatar type' },
        { status: 400 }
      )
    }

    if (profileData.phoneNumber && profileData.phoneNumber.trim()) {
      // Basic phone validation
      const phoneRegex = /^\+?[\d\s\-\(\)]+$/
      if (!phoneRegex.test(profileData.phoneNumber)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }
    }

    console.log(`👤 Updating extended profile for user: ${session.user.id}`)

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

    // Map profile fields
    if (profileData.name && profileData.name.trim()) {
      updateData.name = profileData.name.trim()
    }

    if (profileData.bio !== undefined) {
      updateData.bio = profileData.bio.trim()
    }

    if (profileData.location !== undefined) {
      updateData.location = profileData.location.trim()
    }

    if (profileData.website !== undefined) {
      updateData.website = profileData.website.trim()
    }

    if (profileData.timezone) {
      updateData.timezone = profileData.timezone
    }

    if (profileData.image !== undefined) {
      updateData.image = profileData.image
    }

    if (profileData.avatarType) {
      updateData.avatarType = profileData.avatarType
    }

    if (profileData.phoneNumber !== undefined) {
      updateData.phoneNumber = profileData.phoneNumber.trim()
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

    console.log(`✅ Extended profile updated successfully for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      updatedFields: Object.keys(updateData),
      profile: updatedProfile
    })

  } catch (error) {
    console.error('❌ Update extended profile error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// PATCH method for partial profile updates
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { field, value } = await req.json()

    if (!field) {
      return NextResponse.json(
        { error: 'Field name is required' },
        { status: 400 }
      )
    }

    const allowedFields = ['name', 'bio', 'location', 'website', 'timezone', 'image', 'avatarType', 'phoneNumber']
    
    if (!allowedFields.includes(field)) {
      return NextResponse.json(
        { error: `Field '${field}' is not allowed to be updated` },
        { status: 400 }
      )
    }

    // Validate the specific field value
    if (field === 'name' && (!value || value.trim().length < 2)) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      )
    }

    if (field === 'website' && value && !value.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: 'Website must be a valid URL' },
        { status: 400 }
      )
    }

    if (field === 'bio' && value && value.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    const updateData = {
      [field]: value,
      updatedAt: new Date()
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

    console.log(`✅ Profile field '${field}' updated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: `${field} updated successfully`,
      field,
      value
    })

  } catch (error) {
    console.error('❌ Patch profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // FIXED: Import from enhanced auth
    //const { enhancedAuthOptions as authOptions } = await import('@/lib/enhanced-auth')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { confirmDelete, transferGroupOwnership } = body

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
          linkedAccounts: currentProfile.linkedAccounts?.filter(a => a.isActive && a._id.toString() !== session.user.id) || []
        }, { status: 409 })
      }

      // Transfer group ownership to another active account
      const otherActiveAccount = currentProfile.linkedAccounts?.find(
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

    // FIXED: Complete JSON response
    return NextResponse.json({
      success: true,
      message: 'Account has been deactivated successfully',
      deactivatedAt: new Date().toISOString(),
      groupOwnershipTransferred: currentProfile.groupInfo?.isMaster && currentProfile.groupInfo.activeAccounts > 1
    }, { status: 200 })

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