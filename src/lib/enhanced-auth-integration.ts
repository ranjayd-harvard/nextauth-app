import { EnhancedAccountLinkingService } from './enhanced-account-linking'
import clientPromise from './db'
import { ObjectId } from 'mongodb'

export class EnhancedAuthIntegration {
  // Enhanced user creation with automatic linking detection
  static async createUserWithLinkingCheck(userData: {
    name: string
    email?: string
    phoneNumber?: string
    password?: string
    registerSource: string
    image?: string
    provider?: string
    [key: string]: any
  }) {
    const client = await clientPromise
    const users = client.db().collection('users')
    
    try {
      // Check for linking opportunities before creating user
      const linkingSuggestion = await EnhancedAccountLinkingService.suggestAccountLinking(
        userData.email,
        userData.phoneNumber,
        userData.name
      )

      // Create the new user with ALL required fields
      const newUser = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        accountStatus: 'active',
        
        // Verification status
        emailVerified: userData.registerSource === 'oauth' ? true : false,
        phoneVerified: userData.registerSource === 'phone' ? false : userData.phoneVerified || false,
        
        // Linked accounts arrays
        linkedEmails: userData.email ? [userData.email] : [],
        linkedPhones: userData.phoneNumber ? [userData.phoneNumber] : [],
        linkedProviders: userData.registerSource === 'oauth' && userData.provider ? [userData.provider] : [],
        
        // Verified arrays (NEW - for account status)
        verifiedEmails: userData.registerSource === 'oauth' && userData.email ? [userData.email] : [],
        verifiedPhones: [], // Will be populated when phone is verified
        
        // Two-factor authentication (NEW - for account status)
        twoFactorEnabled: false,
        backupCodes: [],
        
        // Security and activity tracking (NEW - for account status)
        securityLog: [{
          event: 'account_created',
          timestamp: new Date(),
          ip: 'unknown', // Will be populated by the calling function if available
          userAgent: 'unknown',
          registerSource: userData.registerSource
        }]
      }


      const result = await users.insertOne(newUser)
      const newUserId = result.insertedId.toString()

      // Auto-link if confidence is very high (98%+)
      if (linkingSuggestion.shouldSuggest && linkingSuggestion.confidence >= 98) {
        console.log(`🔗 Auto-linking new user ${newUserId} with confidence ${linkingSuggestion.confidence}%`)
        
        const autoLinkResult = await EnhancedAccountLinkingService.autoLinkIfConfident(
          newUserId,
          userData.email,
          userData.phoneNumber,
          userData.name,
          98
        )

        if (autoLinkResult.linked) {
          console.log(`✅ Auto-linked user ${newUserId} into group ${autoLinkResult.groupId}`)
          return {
            success: true,
            userId: newUserId,
            autoLinked: true,
            groupId: autoLinkResult.groupId,
            linkingSuggestion: null // Don't show manual linking since auto-linked
          }
        }
      }

      // Return with linking suggestions for manual review
      return {
        success: true,
        userId: newUserId,
        autoLinked: false,
        linkingSuggestion: linkingSuggestion.shouldSuggest ? linkingSuggestion : null
      }

    } catch (error) {
      console.error('Enhanced user creation error:', error)
      throw error
    }
  }

  // Enhanced user authentication with group support
  static async authenticateUserWithGroup(identifier: {
    email?: string
    phoneNumber?: string
  }) {
    try {
      const user = await EnhancedAccountLinkingService.findUserByIdentifierWithGroup(
        identifier.email,
        identifier.phoneNumber
      )

      if (!user) return null

      // If user has a group, get all group members for context
      let groupAccounts = null
      if (user.groupId) {
        groupAccounts = await EnhancedAccountLinkingService.getGroupAccounts(user.groupId)
      }

      return {
        user,
        groupAccounts,
        hasLinkedAccounts: groupAccounts && groupAccounts.length > 1
      }
    } catch (error) {
      console.error('Enhanced authentication error:', error)
      return null
    }
  }

  // Update user's last sign-in and group activity
  static async updateUserActivity(userId: string) {
    const client = await clientPromise
    const users = client.db().collection('users')
    
    try {
      await users.updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            lastSignIn: new Date(),
            updatedAt: new Date()
          }
        }
      )

      // Also update the group's activity if user belongs to one
      const user = await users.findOne({ _id: new ObjectId(userId) })
      if (user?.groupId) {
        await users.updateMany(
          { groupId: user.groupId },
          { 
            $set: { 
              groupLastActivity: new Date()
            }
          }
        )
      }
    } catch (error) {
      console.error('Error updating user activity:', error)
    }
  }

  // Get user's complete profile including linked accounts
  static async getUserCompleteProfile(userId: string) {
    const client = await clientPromise
    const users = client.db().collection('users')
    
    try {
      const user = await users.findOne({ _id: new ObjectId(userId) })
      if (!user) return null
  
      let linkedAccounts = []
      if (user.groupId) {
        linkedAccounts = await EnhancedAccountLinkingService.getGroupAccounts(user.groupId)
      }
  
      // 🔥 Calculate auth methods correctly
      const authMethods = this.extractUserAuthMethods(user)
      
      // 🔥 Calculate account age in days
      const accountAge = user.createdAt ? 
        Math.floor((new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
  
      return {
        user,
        linkedAccounts,
        authMethods,
        // 🔥 Add proper stats calculation
        stats: {
          accountAge,
          totalAuthMethods: authMethods.length, // This was missing!
          hasLinkedAccounts: linkedAccounts.length > 1
        },
        groupInfo: user.groupId ? {
          groupId: user.groupId,
          isMaster: user.isMaster || false,
          totalAccounts: linkedAccounts.length,
          activeAccounts: linkedAccounts.filter(a => a.isActive).length
        } : null
      }
    } catch (error) {
      console.error('Error getting complete user profile:', error)
      return null
    }
  }
  

  // Helper method to add security log entry with request data
  static async addSecurityLogEntry(userId: string, event: string, details: any = {}, request?: Request) {
    const client = await clientPromise
    const users = client.db().collection('users')
    
    const logEntry = {
      event,
      timestamp: new Date(),
      ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
      userAgent: request?.headers.get('user-agent') || 'unknown',
      ...details
    }
    
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $push: { securityLog: logEntry },
        $set: { updatedAt: new Date() }
      }
    )
  }

  // Extract available authentication methods for a user
  private static extractUserAuthMethods(user: any): string[] {
    const methods: string[] = []
    
    // Check for credentials (password-based login)
    if (user.password) methods.push('credentials')
    
    // Check for verified phone
    if (user.phoneNumber && user.phoneVerified) methods.push('phone')
    
    // Check for OAuth providers
    if (user.linkedProviders && Array.isArray(user.linkedProviders)) {
      user.linkedProviders.forEach((provider: string) => {
        if (!methods.includes(provider)) {
          methods.push(provider)
        }
      })
    }
    
    // Fallback: check registerSource for OAuth if no linkedProviders
    if (user.registerSource && 
        user.registerSource !== 'credentials' && 
        user.registerSource !== 'phone' &&
        !methods.includes(user.registerSource)) {
      methods.push(user.registerSource)
    }
    
    console.log(`🔍 Auth methods calculated for user ${user._id}:`, methods) // Debug log
    return methods
  }
}

