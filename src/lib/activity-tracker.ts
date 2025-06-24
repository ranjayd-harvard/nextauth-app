// src/lib/activity-tracker.ts
import clientPromise from './db'
import { ObjectId } from 'mongodb'

export interface ActivityEvent {
  _id?: ObjectId
  userId: string
  type: ActivityType
  action: string
  details: Record<string, any>
  metadata: {
    ip?: string
    userAgent?: string
    location?: string
    device?: string
  }
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: ActivityCategory
}

export type ActivityType = 
  // Authentication Events
  | 'auth_signin' | 'auth_signout' | 'auth_failed_login' | 'auth_password_reset'
  | 'auth_email_verified' | 'auth_phone_verified' | 'auth_2fa_enabled' | 'auth_2fa_disabled'
  
  // Account Management  
  | 'account_created' | 'account_linked' | 'account_unlinked' | 'account_deleted'
  | 'account_reactivated' | 'account_merged' | 'account_group_created'
  
  // Profile Changes
  | 'profile_updated' | 'profile_image_changed' | 'profile_name_changed'
  | 'profile_email_changed' | 'profile_phone_changed'
  
  // Security Events
  | 'security_email_added' | 'security_email_removed' | 'security_phone_added' 
  | 'security_phone_removed' | 'security_oauth_added' | 'security_oauth_removed'
  | 'security_password_changed' | 'security_suspicious_login'
  
  // Settings Changes
  | 'settings_privacy_changed' | 'settings_notification_changed' 
  | 'settings_preference_changed' | 'settings_timezone_changed'
  
  // Data Events
  | 'data_export_requested' | 'data_download_completed'

export type ActivityCategory = 
  | 'authentication' | 'security' | 'profile' | 'settings' | 'account' | 'data'

export class ActivityTracker {
  private static async getActivitiesCollection() {
    const client = await clientPromise
    return client.db().collection('user_activities')
  }

  // Track a new activity event
  static async track(
    userId: string,
    type: ActivityType,
    action: string,
    details: Record<string, any> = {},
    request?: Request | { ip?: string; userAgent?: string }
  ): Promise<void> {
    try {
      const activities = await this.getActivitiesCollection()
      
      // Extract metadata from request
      const metadata: ActivityEvent['metadata'] = {}
      
      if (request) {
        if ('headers' in request) {
          // It's a Request object
          metadata.ip = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
          metadata.userAgent = request.headers.get('user-agent') || 'unknown'
        } else {
          // It's a metadata object
          metadata.ip = request.ip || 'unknown'
          metadata.userAgent = request.userAgent || 'unknown'
        }
      }

      // Parse device info from user agent
      if (metadata.userAgent && metadata.userAgent !== 'unknown') {
        metadata.device = this.parseDeviceInfo(metadata.userAgent)
      }

      const activity: ActivityEvent = {
        userId,
        type,
        action,
        details,
        metadata,
        timestamp: new Date(),
        severity: this.getSeverity(type),
        category: this.getCategory(type)
      }

      await activities.insertOne(activity)

      // Auto-cleanup old activities (keep last 1000 per user)
      await this.cleanupOldActivities(userId)

      console.log(`📊 Activity tracked: ${type} for user ${userId}`)
    } catch (error) {
      console.error('❌ Failed to track activity:', error)
      // Don't throw - activity tracking should never break the main flow
    }
  }

  // Get activities for a user
  static async getUserActivities(
    userId: string, 
    options: {
      limit?: number
      category?: ActivityCategory
      type?: ActivityType
      severity?: ActivityEvent['severity']
      since?: Date
    } = {}
  ): Promise<ActivityEvent[]> {
    try {
      const activities = await this.getActivitiesCollection()
      
      const query: any = { userId }
      
      if (options.category) query.category = options.category
      if (options.type) query.type = options.type
      if (options.severity) query.severity = options.severity
      if (options.since) query.timestamp = { $gte: options.since }

      const results = await activities
        .find(query)
        .sort({ timestamp: -1 })
        .limit(options.limit || 50)
        .toArray()

      return results as ActivityEvent[]
    } catch (error) {
      console.error('❌ Failed to get user activities:', error)
      return []
    }
  }

  // Get activity summary/stats
  static async getActivitySummary(
    userId: string,
    timeframe: 'day' | 'week' | 'month' = 'week'
  ): Promise<{
    totalActivities: number
    byCategory: Record<ActivityCategory, number>
    bySeverity: Record<ActivityEvent['severity'], number>
    recentLogin: Date | null
    securityEvents: number
  }> {
    try {
      const activities = await this.getActivitiesCollection()
      
      const since = new Date()
      switch (timeframe) {
        case 'day': since.setDate(since.getDate() - 1); break
        case 'week': since.setDate(since.getDate() - 7); break
        case 'month': since.setMonth(since.getMonth() - 1); break
      }

      const allActivities = await activities
        .find({ userId, timestamp: { $gte: since } })
        .toArray()

      // Calculate summary
      const summary = {
        totalActivities: allActivities.length,
        byCategory: {} as Record<ActivityCategory, number>,
        bySeverity: {} as Record<ActivityEvent['severity'], number>,
        recentLogin: null as Date | null,
        securityEvents: 0
      }

      // Initialize counters
      const categories: ActivityCategory[] = ['authentication', 'security', 'profile', 'settings', 'account', 'data']
      const severities: ActivityEvent['severity'][] = ['low', 'medium', 'high', 'critical']
      
      categories.forEach(cat => summary.byCategory[cat] = 0)
      severities.forEach(sev => summary.bySeverity[sev] = 0)

      // Process activities
      for (const activity of allActivities) {
        summary.byCategory[activity.category]++
        summary.bySeverity[activity.severity]++
        
        if (activity.type === 'auth_signin' && (!summary.recentLogin || activity.timestamp > summary.recentLogin)) {
          summary.recentLogin = activity.timestamp
        }
        
        if (activity.category === 'security') {
          summary.securityEvents++
        }
      }

      return summary
    } catch (error) {
      console.error('❌ Failed to get activity summary:', error)
      return {
        totalActivities: 0,
        byCategory: {} as Record<ActivityCategory, number>,
        bySeverity: {} as Record<ActivityEvent['severity'], number>,
        recentLogin: null,
        securityEvents: 0
      }
    }
  }

  // Helper methods
  private static getSeverity(type: ActivityType): ActivityEvent['severity'] {
    const severityMap: Record<ActivityType, ActivityEvent['severity']> = {
      // Critical security events
      'auth_failed_login': 'high',
      'security_suspicious_login': 'critical',
      'account_deleted': 'critical',
      'security_password_changed': 'high',
      
      // Medium security events
      'auth_signin': 'medium',
      'auth_signout': 'low',
      'security_email_added': 'medium',
      'security_phone_added': 'medium',
      'security_oauth_added': 'medium',
      'security_email_removed': 'medium',
      'security_phone_removed': 'medium',
      'security_oauth_removed': 'medium',
      'account_linked': 'medium',
      'account_unlinked': 'medium',
      
      // Low priority events
      'profile_updated': 'low',
      'profile_image_changed': 'low',
      'settings_privacy_changed': 'low',
      'settings_notification_changed': 'low',
      'settings_preference_changed': 'low',
      'settings_timezone_changed': 'low',
      
      // Medium priority events
      'auth_password_reset': 'medium',
      'auth_email_verified': 'medium',
      'auth_phone_verified': 'medium',
      'account_created': 'medium',
      'profile_name_changed': 'medium',
      'profile_email_changed': 'medium',
      'profile_phone_changed': 'medium',
      'data_export_requested': 'medium',
      'data_download_completed': 'low',
      'auth_2fa_enabled': 'medium',
      'auth_2fa_disabled': 'high',
      'account_reactivated': 'medium',
      'account_merged': 'medium',
      'account_group_created': 'medium'
    }
    
    return severityMap[type] || 'low'
  }

  private static getCategory(type: ActivityType): ActivityCategory {
    if (type.startsWith('auth_')) return 'authentication'
    if (type.startsWith('security_')) return 'security'
    if (type.startsWith('profile_')) return 'profile'
    if (type.startsWith('settings_')) return 'settings'
    if (type.startsWith('account_')) return 'account'
    if (type.startsWith('data_')) return 'data'
    return 'account'
  }

  private static parseDeviceInfo(userAgent: string): string {
    // Simple device detection
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile'
    if (/Tablet|iPad/.test(userAgent)) return 'Tablet'
    if (/Windows/.test(userAgent)) return 'Windows'
    if (/Mac/.test(userAgent)) return 'Mac'
    if (/Linux/.test(userAgent)) return 'Linux'
    return 'Unknown'
  }

  private static async cleanupOldActivities(userId: string): Promise<void> {
    try {
      const activities = await this.getActivitiesCollection()
      
      // Keep only the latest 1000 activities per user
      const userActivities = await activities
        .find({ userId })
        .sort({ timestamp: -1 })
        .skip(1000)
        .toArray()

      if (userActivities.length > 0) {
        const oldActivityIds = userActivities.map(a => a._id)
        await activities.deleteMany({ _id: { $in: oldActivityIds } })
      }
    } catch (error) {
      console.error('❌ Failed to cleanup old activities:', error)
    }
  }

  // Convenience methods for common events
  static async trackSignIn(userId: string, method: string, request?: Request) {
    await this.track(userId, 'auth_signin', `Signed in via ${method}`, { method }, request)
  }

  static async trackSignOut(userId: string, request?: Request) {
    await this.track(userId, 'auth_signout', 'Signed out', {}, request)
  }

  static async trackProfileUpdate(userId: string, fields: string[], request?: Request) {
    await this.track(userId, 'profile_updated', 'Profile updated', { fields }, request)
  }

  static async trackSecurityEvent(userId: string, action: string, details: Record<string, any>, request?: Request) {
    const type = `security_${action}` as ActivityType
    await this.track(userId, type, `Security: ${action}`, details, request)
  }

  static async trackAccountEvent(userId: string, action: string, details: Record<string, any>, request?: Request) {
    const type = `account_${action}` as ActivityType
    await this.track(userId, type, `Account: ${action}`, details, request)
  }
}