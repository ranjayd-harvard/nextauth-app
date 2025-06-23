// src/app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

interface UserSettings {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    security: boolean
    marketing: boolean
    weekly_summary: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends'
    show_email: boolean
    show_phone: boolean
    analytics_tracking: boolean
    personalized_ads: boolean
  }
  preferences: {
    language: string
    timezone: string
    date_format: string
    theme: 'light' | 'dark' | 'auto'
    email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  }
  security: {
    two_factor_enabled: boolean
    login_notifications: boolean
    session_timeout: number
    password_change_required: boolean
  }
}

// GET method to fetch user settings
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
      { projection: { settings: 1 } }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Default settings if none exist
    const defaultSettings: UserSettings = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        security: true,
        marketing: false,
        weekly_summary: true
      },
      privacy: {
        profile_visibility: 'private',
        show_email: false,
        show_phone: false,
        analytics_tracking: true,
        personalized_ads: false
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        theme: 'light',
        email_frequency: 'daily'
      },
      security: {
        two_factor_enabled: false,
        login_notifications: true,
        session_timeout: 30,
        password_change_required: false
      }
    }

    const settings = user.settings || defaultSettings

    return NextResponse.json({
      success: true,
      settings
    })

  } catch (error) {
    console.error('❌ Get settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT method to update user settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const settings: UserSettings = await req.json()

    // Validate settings structure
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      )
    }

    // Validate specific fields
    const validProfileVisibility = ['public', 'private', 'friends']
    const validThemes = ['light', 'dark', 'auto']
    const validEmailFrequency = ['immediate', 'daily', 'weekly', 'never']

    if (settings.privacy?.profile_visibility && !validProfileVisibility.includes(settings.privacy.profile_visibility)) {
      return NextResponse.json(
        { error: 'Invalid profile visibility option' },
        { status: 400 }
      )
    }

    if (settings.preferences?.theme && !validThemes.includes(settings.preferences.theme)) {
      return NextResponse.json(
        { error: 'Invalid theme option' },
        { status: 400 }
      )
    }

    if (settings.preferences?.email_frequency && !validEmailFrequency.includes(settings.preferences.email_frequency)) {
      return NextResponse.json(
        { error: 'Invalid email frequency option' },
        { status: 400 }
      )
    }

    if (settings.security?.session_timeout && settings.security.session_timeout < -1) {
      return NextResponse.json(
        { error: 'Invalid session timeout value' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Update user settings
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $set: { 
          settings,
          updatedAt: new Date()
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Settings updated successfully for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    })

  } catch (error) {
    console.error('❌ Update settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH method to update specific setting sections
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { section, updates } = await req.json()

    if (!section || !updates) {
      return NextResponse.json(
        { error: 'Section and updates are required' },
        { status: 400 }
      )
    }

    const validSections = ['notifications', 'privacy', 'preferences', 'security']
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: 'Invalid settings section' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Create update object for the specific section
    const updateObject = {}
    Object.keys(updates).forEach(key => {
      updateObject[`settings.${section}.${key}`] = updates[key]
    })
    updateObject['updatedAt'] = new Date()

    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateObject }
    )

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`✅ ${section} settings updated for user: ${session.user.id}`)

    return NextResponse.json({
      success: true,
      message: `${section} settings updated successfully`,
      section,
      updates
    })

  } catch (error) {
    console.error('❌ Patch settings error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}