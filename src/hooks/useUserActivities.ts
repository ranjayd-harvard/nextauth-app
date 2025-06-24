// src/hooks/useUserActivities.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { ActivityCategory } from '@/lib/activity-tracker'

export interface UserActivity {
  id: string
  type: string
  action: string
  details: Record<string, any>
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: ActivityCategory
  device?: string
  ip?: string
  location?: string
}

export interface ActivitySummary {
  totalActivities: number
  byCategory: Record<ActivityCategory, number>
  bySeverity: Record<string, number>
  recentLogin: Date | null
  securityEvents: number
}

interface UseUserActivitiesResult {
  activities: UserActivity[]
  summary: ActivitySummary | null
  isLoading: boolean
  error: string | null
  fetchActivities: (options?: {
    limit?: number
    category?: ActivityCategory
    includeStats?: boolean
  }) => Promise<void>
  refreshActivities: () => Promise<void>
}

export function useUserActivities(): UseUserActivitiesResult {
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = useCallback(async (options: {
    limit?: number
    category?: ActivityCategory
    includeStats?: boolean
  } = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (options.limit) params.set('limit', options.limit.toString())
      if (options.category) params.set('category', options.category)
      if (options.includeStats) params.set('includeStats', 'true')

      const response = await fetch(`/api/user/activities?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      const data = await response.json()
      
      // Convert timestamp strings back to Date objects
      const formattedActivities = data.activities.map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }))

      setActivities(formattedActivities)
      
      if (data.summary) {
        setSummary({
          ...data.summary,
          recentLogin: data.summary.recentLogin ? new Date(data.summary.recentLogin) : null
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshActivities = useCallback(() => {
    return fetchActivities({ includeStats: true })
  }, [fetchActivities])

  // Auto-fetch on mount
  useEffect(() => {
    fetchActivities({ includeStats: true })
  }, [fetchActivities])

  return {
    activities,
    summary,
    isLoading,
    error,
    fetchActivities,
    refreshActivities
  }
}

// Utility functions for activity display
export function getActivityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    // Authentication
    'auth_signin': '🔓',
    'auth_signout': '🔒',
    'auth_failed_login': '❌',
    'auth_password_reset': '🔑',
    'auth_email_verified': '✅',
    'auth_phone_verified': '📱',
    'auth_2fa_enabled': '🛡️',
    'auth_2fa_disabled': '⚠️',
    
    // Security
    'security_email_added': '📧',
    'security_email_removed': '🗑️',
    'security_phone_added': '📱',
    'security_phone_removed': '🗑️',
    'security_oauth_added': '🔗',
    'security_oauth_removed': '🔓',
    'security_password_changed': '🔐',
    'security_suspicious_login': '🚨',
    
    // Profile
    'profile_updated': '👤',
    'profile_image_changed': '🖼️',
    'profile_name_changed': '✏️',
    'profile_email_changed': '📧',
    'profile_phone_changed': '📱',
    
    // Account
    'account_created': '🎉',
    'account_linked': '🔗',
    'account_unlinked': '🔓',
    'account_deleted': '🗑️',
    'account_merged': '🔀',
    
    // Settings
    'settings_privacy_changed': '🔒',
    'settings_notification_changed': '🔔',
    'settings_preference_changed': '⚙️',
    'settings_timezone_changed': '🌍',
    
    // Data
    'data_export_requested': '📦',
    'data_download_completed': '⬇️'
  }
  
  return iconMap[type] || '📋'
}

export function getSeverityColor(severity: string): string {
  const colorMap: Record<string, string> = {
    'low': 'text-gray-500 bg-gray-100',
    'medium': 'text-blue-500 bg-blue-100',
    'high': 'text-orange-500 bg-orange-100',
    'critical': 'text-red-500 bg-red-100'
  }
  
  return colorMap[severity] || 'text-gray-500 bg-gray-100'
}

export function getCategoryColor(category: ActivityCategory): string {
  const colorMap: Record<ActivityCategory, string> = {
    'authentication': 'text-green-600 bg-green-100',
    'security': 'text-red-600 bg-red-100',
    'profile': 'text-blue-600 bg-blue-100',
    'settings': 'text-purple-600 bg-purple-100',
    'account': 'text-yellow-600 bg-yellow-100',
    'data': 'text-gray-600 bg-gray-100'
  }
  
  return colorMap[category] || 'text-gray-600 bg-gray-100'
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}