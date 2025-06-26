// src/lib/enhanced-account-linking.ts
import clientPromise from './db'
import { ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

export interface LinkingCandidate {
  userId: string
  email?: string
  phoneNumber?: string
  name: string
  authMethods: string[]
  confidence: number
  matchReasons: string[]
  avatar?: string
  groupId?: string
  lastSignIn?: Date
}

export interface MergeResult {
  success: boolean
  groupId?: string
  mergedUserId?: string
  error?: string
  mergedAccounts?: number
}

export interface UserWithGroup {
  _id: ObjectId
  groupId: string
  email?: string
  phoneNumber?: string
  name: string
  authMethods: string[]
  isActive: boolean
  isMaster: boolean
  createdAt: Date
  lastSignIn?: Date
}

export class EnhancedAccountLinkingService {
  private static async getUsersCollection() {
    const client = await clientPromise
    return client.db().collection('users')
  }

  // Generate unique group ID
  private static generateGroupId(): string {
    return `grp_${uuidv4().replace(/-/g, '').substring(0, 16)}`
  }

  // Calculate name similarity using Levenshtein distance
  private static calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0
    
    const a = name1.toLowerCase().trim()
    const b = name2.toLowerCase().trim()
    
    if (a === b) return 100
    
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
    
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        )
      }
    }
    
    const maxLength = Math.max(a.length, b.length)
    return Math.round(((maxLength - matrix[b.length][a.length]) / maxLength) * 100)
  }

  // Enhanced candidate finding with confidence scoring
  static async findLinkingCandidates(
    email?: string, 
    phoneNumber?: string, 
    name?: string,
    excludeUserId?: string
  ): Promise<LinkingCandidate[]> {
    const users = await this.getUsersCollection()
    const candidates: Map<string, LinkingCandidate> = new Map()
    
    const buildQuery = (conditions: any[]) => ({
      $and: [
        { $or: conditions },
        { accountStatus: { $ne: 'merged' } },
        ...(excludeUserId ? [{ _id: { $ne: new ObjectId(excludeUserId) } }] : [])
      ]
    })

    // Email matching (95-100% confidence)
    if (email) {
      const emailConditions = [
        { email: email },
        { primaryEmail: email },
        { linkedEmails: email },
        { 'linkedEmails.0': email }
      ]
      
      const emailMatches = await users.find(buildQuery(emailConditions)).toArray()
      
      for (const user of emailMatches) {
        const matchReasons = ['Email match']
        let confidence = 95
        
        // Boost confidence if exact primary email match
        if (user.email === email || user.primaryEmail === email) {
          confidence = 100
          matchReasons.push('Primary email match')
        }
        
        candidates.set(user._id.toString(), {
          userId: user._id.toString(),
          email: user.email || user.primaryEmail,
          phoneNumber: user.phoneNumber || user.primaryPhone,
          name: user.name,
          authMethods: this.extractAuthMethods(user),
          confidence,
          matchReasons,
          avatar: user.image,
          groupId: user.groupId,
          lastSignIn: user.lastSignIn
        })
      }
    }

    // Phone matching (90-100% confidence)
    if (phoneNumber) {
      const phoneConditions = [
        { phoneNumber: phoneNumber },
        { primaryPhone: phoneNumber },
        { linkedPhones: phoneNumber },
        { 'linkedPhones.0': phoneNumber }
      ]
      
      const phoneMatches = await users.find(buildQuery(phoneConditions)).toArray()
      
      for (const user of phoneMatches) {
        const userId = user._id.toString()
        const existing = candidates.get(userId)
        
        if (existing) {
          // User already found by email - boost confidence
          existing.confidence = 100
          existing.matchReasons.push('Phone match')
          if (user.phoneNumber === phoneNumber || user.primaryPhone === phoneNumber) {
            existing.matchReasons.push('Primary phone match')
          }
        } else {
          const matchReasons = ['Phone match']
          let confidence = 90
          
          if (user.phoneNumber === phoneNumber || user.primaryPhone === phoneNumber) {
            confidence = 95
            matchReasons.push('Primary phone match')
          }
          
          candidates.set(userId, {
            userId,
            email: user.email || user.primaryEmail,
            phoneNumber: user.phoneNumber || user.primaryPhone,
            name: user.name,
            authMethods: this.extractAuthMethods(user),
            confidence,
            matchReasons,
            avatar: user.image,
            groupId: user.groupId,
            lastSignIn: user.lastSignIn
          })
        }
      }
    }

    // Name similarity matching (60-85% confidence)
    if (name && name.length > 2) {
      const nameMatches = await users.find({
        $and: [
          { 
            name: { 
              $regex: new RegExp(name.split(' ').join('|'), 'i') 
            } 
          },
          { accountStatus: { $ne: 'merged' } },
          ...(excludeUserId ? [{ _id: { $ne: new ObjectId(excludeUserId) } }] : [])
        ]
      }).toArray()
      
      for (const user of nameMatches) {
        const userId = user._id.toString()
        const nameSimilarity = this.calculateNameSimilarity(name, user.name)
        
        if (nameSimilarity >= 60) {
          const existing = candidates.get(userId)
          
          if (existing) {
            // Already found by email/phone - add name match
            if (nameSimilarity >= 80) {
              existing.matchReasons.push('Strong name match')
              existing.confidence = Math.min(100, existing.confidence + 5)
            }
          } else if (nameSimilarity >= 70) {
            // New candidate based on name similarity
            const matchReasons = [`Name similarity (${nameSimilarity}%)`]
            const confidence = Math.min(85, 60 + (nameSimilarity - 70) * 0.8)
            
            candidates.set(userId, {
              userId,
              email: user.email || user.primaryEmail,
              phoneNumber: user.phoneNumber || user.primaryPhone,
              name: user.name,
              authMethods: this.extractAuthMethods(user),
              confidence: Math.round(confidence),
              matchReasons,
              avatar: user.image,
              groupId: user.groupId,
              lastSignIn: user.lastSignIn
            })
          }
        }
      }
    }

    return Array.from(candidates.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8) // Return top 8 matches
  }

  // Extract authentication methods from user object
  private static extractAuthMethods(user: any): string[] {
    const methods: string[] = []
    
    if (user.password) methods.push('credentials')
    if (user.phoneNumber && user.phoneVerified) methods.push('phone')
    if (user.linkedProviders?.includes('google')) methods.push('google')
    if (user.linkedProviders?.includes('github')) methods.push('github')
    if (user.registerSource === 'oauth' && !methods.includes('google') && !methods.includes('github')) {
      methods.push('oauth')
    }
    
    return methods
  }

  // Create account group with master account
  static async createAccountGroup(masterUserId: string): Promise<{ success: boolean; groupId?: string; error?: string }> {
    const users = await this.getUsersCollection()
    
    try {
      const masterUser = await users.findOne({ _id: new ObjectId(masterUserId) })
      if (!masterUser) {
        return { success: false, error: 'Master user not found' }
      }

      // Check if user already has a group
      if (masterUser.groupId) {
        return { success: true, groupId: masterUser.groupId }
      }

      const groupId = this.generateGroupId()
      
      await users.updateOne(
        { _id: new ObjectId(masterUserId) },
        { 
          $set: { 
            groupId,
            isMaster: true,
            isActive: true,
            groupCreatedAt: new Date(),
            updatedAt: new Date()
          }
        }
      )

      return { success: true, groupId }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Enhanced account merging with group management
  static async mergeAccountsWithGroup(
    primaryUserId: string, 
    secondaryUserIds: string[],
    createNewGroup: boolean = true
  ): Promise<MergeResult> {
    const users = await this.getUsersCollection()
    
    try {
      // Get all users to merge
      const allUserIds = [primaryUserId, ...secondaryUserIds]
      const allUsers = await users.find({
        _id: { $in: allUserIds.map(id => new ObjectId(id)) }
      }).toArray()

      if (allUsers.length !== allUserIds.length) {
        return { success: false, error: 'One or more users not found' }
      }

      const primaryUser = allUsers.find(u => u._id.toString() === primaryUserId)
      const secondaryUsers = allUsers.filter(u => u._id.toString() !== primaryUserId)

      // Determine group ID
      let groupId = primaryUser.groupId
      
      if (!groupId && createNewGroup) {
        groupId = this.generateGroupId()
      } else if (!groupId) {
        // Try to find existing group from secondary users
        for (const user of secondaryUsers) {
          if (user.groupId) {
            groupId = user.groupId
            break
          }
        }
        
        // If still no group, create one
        if (!groupId) {
          groupId = this.generateGroupId()
        }
      }

      // Collect all data for merging
      const allEmails = new Set<string>()
      const allPhones = new Set<string>()
      const allProviders = new Set<string>()
      let mergedPassword = primaryUser.password
      let mergedImage = primaryUser.image
      let emailVerified = primaryUser.emailVerified || false
      let phoneVerified = primaryUser.phoneVerified || false

      // Process primary user data
      if (primaryUser.email) allEmails.add(primaryUser.email)
      if (primaryUser.primaryEmail) allEmails.add(primaryUser.primaryEmail)
      if (primaryUser.linkedEmails) {
        primaryUser.linkedEmails.forEach(email => allEmails.add(email))
      }
      
      if (primaryUser.phoneNumber) allPhones.add(primaryUser.phoneNumber)
      if (primaryUser.primaryPhone) allPhones.add(primaryUser.primaryPhone)
      if (primaryUser.linkedPhones) {
        primaryUser.linkedPhones.forEach(phone => allPhones.add(phone))
      }

      if (primaryUser.linkedProviders) {
        primaryUser.linkedProviders.forEach(provider => allProviders.add(provider))
      }

      // Process secondary users data
      for (const user of secondaryUsers) {
        if (user.email) allEmails.add(user.email)
        if (user.primaryEmail) allEmails.add(user.primaryEmail)
        if (user.linkedEmails) {
          user.linkedEmails.forEach(email => allEmails.add(email))
        }
        
        if (user.phoneNumber) allPhones.add(user.phoneNumber)
        if (user.primaryPhone) allPhones.add(user.primaryPhone)
        if (user.linkedPhones) {
          user.linkedPhones.forEach(phone => allPhones.add(phone))
        }

        if (user.linkedProviders) {
          user.linkedProviders.forEach(provider => allProviders.add(provider))
        }

        // Keep password if primary doesn't have one
        if (!mergedPassword && user.password) {
          mergedPassword = user.password
        }

        // Keep better image if available
        if (!mergedImage || (user.image && user.avatarType === 'oauth')) {
          mergedImage = user.image
        }

        // Keep verification status
        if (user.emailVerified) emailVerified = true
        if (user.phoneVerified) phoneVerified = true
      }

      // Prepare merged data
      const linkedEmails = Array.from(allEmails).filter(Boolean)
      const linkedPhones = Array.from(allPhones).filter(Boolean)
      const linkedProviders = Array.from(allProviders).filter(Boolean)

      const mergedData = {
        groupId,
        isMaster: true,
        isActive: true,
        
        // Primary identifiers
        email: primaryUser.email || linkedEmails[0],
        primaryEmail: primaryUser.email || linkedEmails[0],
        phoneNumber: primaryUser.phoneNumber || linkedPhones[0],
        primaryPhone: primaryUser.phoneNumber || linkedPhones[0],
        
        // Linked data
        linkedEmails,
        linkedPhones,
        linkedProviders,
        
        // Merged fields
        name: primaryUser.name,
        image: mergedImage,
        password: mergedPassword,
        emailVerified,
        phoneVerified,
        
        // Account metadata
        accountStatus: 'active',
        registerSource: primaryUser.registerSource,
        avatarType: primaryUser.avatarType,
        mergedAccounts: secondaryUserIds.map(id => new ObjectId(id)),
        
        // Timestamps
        lastMergeAt: new Date(),
        updatedAt: new Date()
      }

      // Update primary account with merged data
      await users.updateOne(
        { _id: new ObjectId(primaryUserId) },
        { $set: mergedData }
      )

      // Mark secondary accounts as merged
      for (const userId of secondaryUserIds) {
        await users.updateOne(
          { _id: new ObjectId(userId) },
          { 
            $set: { 
              groupId,
              accountStatus: 'merged',
              mergedInto: new ObjectId(primaryUserId),
              mergedAt: new Date(),
              isActive: false,
              isMaster: false
            }
          }
        )
      }

      console.log(`✅ Successfully merged ${secondaryUserIds.length} accounts into group ${groupId}`)
      
      return { 
        success: true, 
        groupId, 
        mergedUserId: primaryUserId,
        mergedAccounts: secondaryUserIds.length
      }

    } catch (error) {
      console.error('❌ Account merge failed:', error)
      return { success: false, error: error.message }
    }
  }

  // Get all accounts in a group
  static async getGroupAccounts(groupId: string): Promise<UserWithGroup[]> {
    const users = await this.getUsersCollection()
    
    const accounts = await users.find({ 
      groupId,
      $or: [
        { accountStatus: 'active' },
        { accountStatus: 'merged' },
        { accountStatus: { $exists: false } }
      ]
    }).toArray()

    return accounts.map(user => ({
      _id: user._id,
      groupId: user.groupId,
      email: user.email || user.primaryEmail,
      phoneNumber: user.phoneNumber || user.primaryPhone,
      name: user.name,
      authMethods: this.extractAuthMethods(user),
      isActive: user.accountStatus !== 'merged',
      isMaster: user.isMaster || false,
      createdAt: user.createdAt,
      lastSignIn: user.lastSignIn
    }))
  }

  // Find user by any identifier with group support
  static async findUserByIdentifierWithGroup(email?: string, phoneNumber?: string) {
    const users = await this.getUsersCollection()
    
    const conditions: any[] = []
    
    if (email) {
      conditions.push(
        { email },
        { primaryEmail: email },
        { linkedEmails: email }
      )
    }
    
    if (phoneNumber) {
      conditions.push(
        { phoneNumber },
        { primaryPhone: phoneNumber },
        { linkedPhones: phoneNumber }
      )
    }

    if (conditions.length === 0) return null

    // Find the active user (not merged)
    const user = await users.findOne({
      $and: [
        { $or: conditions },
        { 
          $or: [
            { accountStatus: 'active' },
            { accountStatus: { $exists: false } }
          ]
        }
      ]
    })

    return user
  }

  // Smart linking suggestion during registration/signin
  static async suggestAccountLinking(
    email?: string,
    phoneNumber?: string,
    name?: string
  ): Promise<{
    shouldSuggest: boolean
    candidates: LinkingCandidate[]
    confidence: number
  }> {
    const candidates = await this.findLinkingCandidates(email, phoneNumber, name)
    
    // Only suggest if we have high-confidence matches
    const highConfidenceCandidates = candidates.filter(c => c.confidence >= 80)
    
    return {
      shouldSuggest: highConfidenceCandidates.length > 0,
      candidates: highConfidenceCandidates,
      confidence: highConfidenceCandidates.length > 0 ? 
        Math.max(...highConfidenceCandidates.map(c => c.confidence)) : 0
    }
  }

  // Automatic linking for very high confidence matches
  static async autoLinkIfConfident(
    newUserId: string,
    email?: string,
    phoneNumber?: string,
    name?: string,
    confidenceThreshold: number = 95
  ): Promise<{ linked: boolean; groupId?: string; message?: string }> {
    const suggestion = await this.suggestAccountLinking(email, phoneNumber, name)
    
    if (!suggestion.shouldSuggest || suggestion.confidence < confidenceThreshold) {
      return { linked: false }
    }

    // Find the best candidate (highest confidence)
    const bestCandidate = suggestion.candidates[0]
    
    // Auto-link only if exact email or phone match
    const hasExactMatch = bestCandidate.matchReasons.some(reason => 
      reason.includes('Primary email match') || 
      reason.includes('Primary phone match') ||
      reason.includes('Email match')
    )

    if (!hasExactMatch) {
      return { linked: false, message: 'No exact match found' }
    }

    try {
      // Perform the merge
      const mergeResult = await this.mergeAccountsWithGroup(
        bestCandidate.userId,
        [newUserId],
        !bestCandidate.groupId // Create new group if candidate doesn't have one
      )

      if (mergeResult.success) {
        return {
          linked: true,
          groupId: mergeResult.groupId,
          message: `Automatically linked with existing account (${bestCandidate.confidence}% confidence)`
        }
      } else {
        return { linked: false, message: `Auto-link failed: ${mergeResult.error}` }
      }
    } catch (error) {
      return { linked: false, message: `Auto-link error: ${error.message}` }
    }
  }

  // Add this method to your EnhancedAccountLinkingService class

  static async linkOAuthAccount(params: {
    email: string;
    provider: string;
    providerAccountId: string;
    name?: string;
    image?: string;
  }): Promise<{
    success: boolean;
    userId?: string;
    groupId?: string;
    linked?: boolean;
    message?: string;
    error?: string;
  }> {
    const { email, provider, providerAccountId, name, image } = params;
    const users = await this.getUsersCollection();

    try {
      // First, check if this OAuth account already exists
      const existingOAuthUser = await users.findOne({
        $and: [
          { [`accounts.${provider}.providerAccountId`]: providerAccountId },
          { accountStatus: { $ne: 'merged' } }
        ]
      });

      if (existingOAuthUser) {
        return {
          success: true,
          userId: existingOAuthUser._id.toString(),
          groupId: existingOAuthUser.groupId,
          linked: false,
          message: 'OAuth account already exists'
        };
      }

      // Look for existing users with this email
      const existingUser = await this.findUserByIdentifierWithGroup(email);

      if (existingUser) {
        // User exists with this email - link the OAuth account
        const updateData: any = {
          [`accounts.${provider}`]: {
            providerAccountId,
            provider,
            linkedAt: new Date()
          },
          $addToSet: {
            linkedProviders: provider
          },
          updatedAt: new Date()
        };

        // Update image if it's an OAuth avatar and user doesn't have one
        if (image && (!existingUser.image || existingUser.avatarType !== 'oauth')) {
          updateData.image = image;
          updateData.avatarType = 'oauth';
        }

        await users.updateOne(
          { _id: existingUser._id },
          { $set: updateData }
        );

        return {
          success: true,
          userId: existingUser._id.toString(),
          groupId: existingUser.groupId,
          linked: true,
          message: `${provider} account linked to existing user`
        };
      }

      // No existing user found - create new user
      const newUserId = new ObjectId();
      const userData = {
        _id: newUserId,
        email,
        name: name || email.split('@')[0],
        image,
        avatarType: 'oauth',
        emailVerified: true, // OAuth emails are typically verified
        registerSource: 'oauth',
        accounts: {
          [provider]: {
            providerAccountId,
            provider,
            linkedAt: new Date()
          }
        },
        linkedProviders: [provider],
        accountStatus: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date()
      };

      await users.insertOne(userData);

      // Try to auto-link with high confidence
      const autoLinkResult = await this.autoLinkIfConfident(
        newUserId.toString(),
        email,
        undefined, // no phone
        name,
        90 // lower threshold for OAuth since email is verified
      );

      if (autoLinkResult.linked) {
        return {
          success: true,
          userId: newUserId.toString(),
          groupId: autoLinkResult.groupId,
          linked: true,
          message: autoLinkResult.message
        };
      }

      return {
        success: true,
        userId: newUserId.toString(),
        linked: false,
        message: 'New OAuth user created'
      };

    } catch (error) {
      console.error('❌ linkOAuthAccount error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}