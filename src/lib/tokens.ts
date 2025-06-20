import crypto from 'crypto'
import clientPromise from './db'

export interface TokenData {
  userId?: string
  email?: string
  phoneNumber?: string
  type: 'email_verification' | 'password_reset' | 'phone_verification' | 'phone_login'
  token: string
  expires: Date
  used: boolean
  attempts?: number
}

export class TokenManager {
  private static async getTokensCollection() {
    const client = await clientPromise
    return client.db().collection('verification_tokens')
  }

  // Generate a secure random token
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  // Generate a 6-digit SMS code
  static generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Create and store a token
  static async createToken(
    identifier: string, // email or phoneNumber
    type: 'email_verification' | 'password_reset' | 'phone_verification' | 'phone_login',
    expiresInMinutes: number = 10,
    userId?: string
  ): Promise<string> {
    const tokens = await this.getTokensCollection()
    
    // For SMS codes, use 6-digit codes
    const token = (type === 'phone_verification' || type === 'phone_login') 
      ? this.generateSMSCode() 
      : this.generateToken()
    
    const expires = new Date()
    expires.setMinutes(expires.getMinutes() + expiresInMinutes)

    // Remove any existing tokens of the same type for this identifier
    const query = type.includes('phone') 
      ? { phoneNumber: identifier, type }
      : { email: identifier, type }
    
    await tokens.deleteMany(query)

    // Create new token
    const tokenDoc: any = {
      type,
      token,
      expires,
      used: false,
      attempts: 0,
      createdAt: new Date(),
    }

    if (userId) tokenDoc.userId = userId
    if (type.includes('phone')) {
      tokenDoc.phoneNumber = identifier
    } else {
      tokenDoc.email = identifier
    }

    await tokens.insertOne(tokenDoc)
    return token
  }

  // Verify and consume a token
  static async verifyToken(
    token: string,
    type: 'email_verification' | 'password_reset' | 'phone_verification' | 'phone_login',
    identifier?: string // phone number or email for additional verification
  ): Promise<{ valid: boolean; userId?: string; email?: string; phoneNumber?: string; error?: string; attemptsLeft?: number }> {
    const tokens = await this.getTokensCollection()
    
    const query: any = { token, type }
    if (identifier && type.includes('phone')) {
      query.phoneNumber = identifier
    } else if (identifier && !type.includes('phone')) {
      query.email = identifier
    }
    
    const tokenDoc = await tokens.findOne(query)
    
    if (!tokenDoc) {
      return { valid: false, error: 'Invalid code' }
    }

    if (tokenDoc.used) {
      return { valid: false, error: 'Code has already been used' }
    }

    if (new Date() > tokenDoc.expires) {
      return { valid: false, error: 'Code has expired' }
    }

    // For SMS codes, implement attempt limiting
    if (type === 'phone_verification' || type === 'phone_login') {
      const maxAttempts = 3
      const currentAttempts = (tokenDoc.attempts || 0) + 1
      
      if (currentAttempts > maxAttempts) {
        await tokens.updateOne(
          { _id: tokenDoc._id },
          { $set: { used: true, usedAt: new Date() } }
        )
        return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' }
      }

      // If token doesn't match, increment attempts
      if (tokenDoc.token !== token) {
        await tokens.updateOne(
          { _id: tokenDoc._id },
          { $set: { attempts: currentAttempts } }
        )
        return { 
          valid: false, 
          error: 'Incorrect code', 
          attemptsLeft: maxAttempts - currentAttempts 
        }
      }
    }

    // Mark token as used
    await tokens.updateOne(
      { _id: tokenDoc._id },
      { $set: { used: true, usedAt: new Date() } }
    )

    return {
      valid: true,
      userId: tokenDoc.userId,
      email: tokenDoc.email,
      phoneNumber: tokenDoc.phoneNumber,
    }
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens(): Promise<number> {
    const tokens = await this.getTokensCollection()
    const result = await tokens.deleteMany({
      expires: { $lt: new Date() }
    })
    return result.deletedCount || 0
  }
}
