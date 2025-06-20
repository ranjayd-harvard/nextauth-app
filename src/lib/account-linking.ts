import clientPromise from './db'
import { ObjectId } from 'mongodb'

export interface LinkingCandidate {
  userId: string
  email?: string
  phoneNumber?: string
  name: string
  authMethod: string
  confidence: number
  matchReason: string[]
}

export class AccountLinkingService {
  private static async getUsersCollection() {
    const client = await clientPromise
    return client.db().collection('users')
  }

  // Find potential accounts to link
  static async findLinkingCandidates(
    email?: string, 
    phoneNumber?: string, 
    name?: string,
    excludeUserId?: string
  ): Promise<LinkingCandidate[]> {
    const users = await this.getUsersCollection()
    const candidates: LinkingCandidate[] = []
    
    // Search by email
    if (email) {
      const emailMatches = await users.find({
        $or: [
          { email: email },
          { primaryEmail: email },
          { linkedEmails: email }
        ],
        ...(excludeUserId && { _id: { $ne: new ObjectId(excludeUserId) } })
      }).toArray()

      for (const user of emailMatches) {
        candidates.push({
          userId: user._id.toString(),
          email: user.email || user.primaryEmail,
          phoneNumber: user.phoneNumber || user.primaryPhone,
          name: user.name,
          authMethod: user.registerSource || 'unknown',
          confidence: 95,
          matchReason: ['Email match']
        })
      }
    }

    // Search by phone
    if (phoneNumber) {
      const phoneMatches = await users.find({
        $or: [
          { phoneNumber: phoneNumber },
          { primaryPhone: phoneNumber },
          { linkedPhones: phoneNumber }
        ],
        ...(excludeUserId && { _id: { $ne: new ObjectId(excludeUserId) } })
      }).toArray()

      for (const user of phoneMatches) {
        const existingCandidate = candidates.find(c => c.userId === user._id.toString())
        if (existingCandidate) {
          existingCandidate.confidence = 100
          existingCandidate.matchReason.push('Phone match')
        } else {
          candidates.push({
            userId: user._id.toString(),
            email: user.email || user.primaryEmail,
            phoneNumber: user.phoneNumber || user.primaryPhone,
            name: user.name,
            authMethod: user.registerSource || 'unknown',
            confidence: 90,
            matchReason: ['Phone match']
          })
        }
      }
    }

    return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
  }

  // Merge two accounts
  static async mergeAccounts(primaryUserId: string, secondaryUserId: string) {
    const users = await this.getUsersCollection()
    
    try {
      const [primaryUser, secondaryUser] = await Promise.all([
        users.findOne({ _id: new ObjectId(primaryUserId) }),
        users.findOne({ _id: new ObjectId(secondaryUserId) })
      ])

      if (!primaryUser || !secondaryUser) {
        return { success: false, error: 'User not found' }
      }

      // Merge data
      const mergedData = {
        name: primaryUser.name || secondaryUser.name,
        image: primaryUser.image || secondaryUser.image,
        
        // Merge emails
        linkedEmails: [
          ...new Set([
            primaryUser.email,
            primaryUser.primaryEmail,
            ...(primaryUser.linkedEmails || []),
            secondaryUser.email,
            secondaryUser.primaryEmail,
            ...(secondaryUser.linkedEmails || [])
          ].filter(Boolean))
        ],
        
        // Merge phones
        linkedPhones: [
          ...new Set([
            primaryUser.phoneNumber,
            primaryUser.primaryPhone,
            ...(primaryUser.linkedPhones || []),
            secondaryUser.phoneNumber,
            secondaryUser.primaryPhone,
            ...(secondaryUser.linkedPhones || [])
          ].filter(Boolean))
        ],
        
        // Set primary identifiers
        primaryEmail: primaryUser.email || primaryUser.primaryEmail || secondaryUser.email,
        primaryPhone: primaryUser.phoneNumber || primaryUser.primaryPhone || secondaryUser.phoneNumber,
        
        // Keep passwords if available
        password: primaryUser.password || secondaryUser.password,
        
        // Keep verification status
        emailVerified: primaryUser.emailVerified || secondaryUser.emailVerified,
        phoneVerified: primaryUser.phoneVerified || secondaryUser.phoneVerified,
        
        // Account status
        accountStatus: 'active',
        mergedAccounts: [
          ...(primaryUser.mergedAccounts || []),
          new ObjectId(secondaryUserId)
        ],
        updatedAt: new Date()
      }

      // Update primary account
      await users.updateOne(
        { _id: new ObjectId(primaryUserId) },
        { $set: mergedData }
      )

      // Mark secondary as merged
      await users.updateOne(
        { _id: new ObjectId(secondaryUserId) },
        { 
          $set: { 
            accountStatus: 'merged',
            mergedInto: new ObjectId(primaryUserId),
            mergedAt: new Date()
          }
        }
      )

      console.log(`✅ Merged account ${secondaryUserId} into ${primaryUserId}`)
      return { success: true }

    } catch (error) {
      console.error('❌ Merge failed:', error)
      return { success: false, error: error.message }
    }
  }

  // Find user by any identifier (for auth)
  static async findUserByAnyIdentifier(email?: string, phoneNumber?: string) {
    const users = await this.getUsersCollection()
    
    const query: any = {
      accountStatus: { $ne: 'merged' }
    }

    if (email && phoneNumber) {
      query.$or = [
        { email: email },
        { primaryEmail: email },
        { linkedEmails: email },
        { phoneNumber: phoneNumber },
        { primaryPhone: phoneNumber },
        { linkedPhones: phoneNumber }
      ]
    } else if (email) {
      query.$or = [
        { email: email },
        { primaryEmail: email },
        { linkedEmails: email }
      ]
    } else if (phoneNumber) {
      query.$or = [
        { phoneNumber: phoneNumber },
        { primaryPhone: phoneNumber },
        { linkedPhones: phoneNumber }
      ]
    }

    return await users.findOne(query)
  }
}
