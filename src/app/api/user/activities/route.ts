// src/app/api/user/activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import { ActivityTracker, ActivityCategory, ActivityEvent } from '@/lib/activity-tracker'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const category = searchParams.get('category') as ActivityCategory | null
    const timeframe = searchParams.get('timeframe') as 'day' | 'week' | 'month' || 'week'
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get user activities
    const activities = await ActivityTracker.getUserActivities(session.user.id, {
      limit,
      category: category || undefined
    })

    // Get activity summary if requested
    let summary = null
    if (includeStats) {
      summary = await ActivityTracker.getActivitySummary(session.user.id, timeframe)
    }

    // Format activities for frontend
    const formattedActivities = activities.map(activity => ({
      id: activity._id?.toString(),
      type: activity.type,
      action: activity.action,
      details: activity.details,
      timestamp: activity.timestamp,
      severity: activity.severity,
      category: activity.category,
      device: activity.metadata.device,
      ip: activity.metadata.ip?.replace(/\.\d+$/, '.***'), // Partially hide IP
      location: activity.metadata.location
    }))

    return NextResponse.json({
      success: true,
      activities: formattedActivities,
      summary,
      total: activities.length
    })

  } catch (error) {
    console.error('❌ Get user activities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}