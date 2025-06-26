// src/lib/enhanced-auth.ts - Corrected with complete 2FA support
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './db'
import { TokenManager } from './tokens'
import { verifyCode } from './sms'
import { EnhancedAccountLinkingService } from './enhanced-account-linking'
import { EnhancedAuthIntegration } from './enhanced-auth-integration'
import { ActivityTracker } from './activity-tracker'
import speakeasy from 'speakeasy'

// Format phone number function (same as used in registration)
function formatPhoneNumber(phoneNumber: string, countryCode: string = 'US'): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  const countryPrefixes: Record<string, string> = {
    'US': '+1', 'CA': '+1', 'GB': '+44', 'IN': '+91',
    'AU': '+61', 'DE': '+49', 'FR': '+33', 'JP': '+81',
    'BR': '+55', 'MX': '+52', 'IT': '+39', 'ES': '+34',
    'NL': '+31', 'SE': '+46', 'NO': '+47', 'DK': '+45',
    'FI': '+358', 'PL': '+48', 'CZ': '+420', 'HU': '+36'
  }
  const prefix = countryPrefixes[countryCode] || '+1'
  if (phoneNumber.startsWith('+')) {
    return phoneNumber
  }
  if ((countryCode === 'US' || countryCode === 'CA') && cleaned.startsWith('1')) {
    return `+1${cleaned.substring(1)}`
  }
  return `${prefix}${cleaned}`
}

export const enhancedAuthOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "user:email"
        }
      }
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        twoFactorCode: { label: '2FA Code', type: 'text' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Use enhanced authentication to find user with group support
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          email: credentials.email
        })

        if (!authResult?.user) {
          console.log('❌ DEBUG: User not found for email:', credentials.email)
          // Track failed login attempt
          await ActivityTracker.track(
            credentials.email,
            'auth_failed_login',
            'Failed login attempt - user not found',
            { 
              reason: 'user_not_found', 
              email: credentials.email,
              provider: 'credentials'
            },
            req
          )
          return null
        }

        const user = authResult.user
        console.log('🔍 DEBUG: User found:', {
          id: user._id,
          email: user.email,
          twoFactorEnabled: user.twoFactorEnabled,
          hasTwoFactorSecret: !!user.twoFactorSecret,
          hasBackupCodes: !!(user.backupCodes && user.backupCodes.length > 0),
          backupCodesCount: user.backupCodes?.length || 0
        })

        // Check if user registered with OAuth but trying to sign in with credentials
        if (!user.password && user.registerSource !== 'credentials') {
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            `Failed login attempt - registered with ${user.registerSource}`,
            { 
              reason: 'wrong_provider', 
              email: credentials.email,
              actualProvider: user.registerSource,
              attemptedProvider: 'credentials'
            },
            req
          )
          throw new Error(`This email is registered with ${user.registerSource}. Please use ${user.registerSource} to sign in.`)
        }

        if (!user.password) {
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            'Failed login attempt - no password set',
            { 
              reason: 'no_password', 
              email: credentials.email 
            },
            req
          )
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        
        if (!isPasswordValid) {
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            'Failed login attempt - invalid password',
            { 
              reason: 'invalid_password', 
              email: credentials.email 
            },
            req
          )
          return null
        }

        // Check if 2FA is enabled for this user
        if (user.twoFactorEnabled && user.twoFactorSecret) {
          const twoFactorCode = credentials.twoFactorCode
          console.log('🔍 DEBUG: 2FA Code received:', twoFactorCode)

          if (!twoFactorCode) {
            console.log('❌ DEBUG: No 2FA code provided, throwing 2FA_REQUIRED')
            throw new Error('2FA_REQUIRED')
          }

          // Verify 2FA code
          console.log('🔍 DEBUG: Attempting TOTP verification...')
          const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 2
          })
          console.log('🔍 DEBUG: TOTP verification result:', verified)

          if (verified) {
            console.log('✅ DEBUG: TOTP verification successful!')
            // TOTP is valid, continue with authentication
          } else {
            // Check backup codes
            console.log('🔍 DEBUG: TOTP failed, checking backup codes...')
            if (user.backupCodes && user.backupCodes.includes(twoFactorCode.toUpperCase())) {
              console.log('✅ DEBUG: Backup code valid!')
              // Remove used backup code
              const client = await clientPromise
              const users = client.db().collection('users')
              await users.updateOne(
                { _id: user._id },
                { $pull: { backupCodes: twoFactorCode.toUpperCase() } }
              )
            } else {
              console.log('❌ DEBUG: Both TOTP and backup code failed')
              throw new Error('Invalid 2FA code')
            }
          }
          
          console.log('✅ DEBUG: 2FA validation passed, continuing...')
        }

        // Update user activity through Enhanced Auth Integration
        await EnhancedAuthIntegration.updateUserActivity(user._id.toString())
        console.log('✅ DEBUG: Authentication successful, returning user')

        // Successful authentication
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          registerSource: user.registerSource,
          avatarType: user.avatarType,
          twoFactorEnabled: user.twoFactorEnabled || false,
          groupId: user.groupId,
          linkedEmails: user.linkedEmails || [],
          linkedPhones: user.linkedPhones || [],
          linkedProviders: user.linkedProviders || [],
          hasLinkedAccounts: authResult.hasLinkedAccounts
        }
      }
    }),
    CredentialsProvider({
      id: 'phone',
      name: 'Phone Number', 
      credentials: {
        phoneNumber: { label: 'Phone Number', type: 'tel' },
        code: { label: 'Verification Code', type: 'text' }
      },
      async authorize(credentials, req) {
        console.log('🔐 Phone provider authorize called with:', credentials)
        
        if (!credentials?.phoneNumber || !credentials?.code) {
          return null
        }

        // Format the phone number consistently
        const formattedPhoneNumber = formatPhoneNumber(credentials.phoneNumber)
        console.log('🔐 Formatted phone number:', formattedPhoneNumber)

        // Use enhanced authentication to find user with group support
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          phoneNumber: formattedPhoneNumber
        })

        if (!authResult?.user) {
          console.log('❌ User not found for phone:', formattedPhoneNumber)
          await ActivityTracker.track(
            formattedPhoneNumber,
            'auth_failed_login',
            'Failed phone login attempt - user not found',
            { 
              reason: 'user_not_found', 
              phoneNumber: formattedPhoneNumber,
              provider: 'phone'
            },
            req
          )
          return null
        }

        const user = authResult.user

        // Verify the SMS code
        const isCodeValid = await verifyCode(formattedPhoneNumber, credentials.code)
        
        if (!isCodeValid) {
          console.log('❌ Invalid verification code for phone:', formattedPhoneNumber)
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            'Failed phone login attempt - invalid code',
            { 
              reason: 'invalid_code', 
              phoneNumber: formattedPhoneNumber 
            },
            req
          )
          throw new Error('Invalid or expired login code')
        }

        console.log('🔐 Phone authentication successful for user:', user._id)

        // Update user activity
        await EnhancedAuthIntegration.updateUserActivity(user._id.toString())

        // Successful phone authentication
        return {
          id: user._id.toString(),
          phoneNumber: formattedPhoneNumber,
          email: user.email || user.primaryEmail,
          name: user.name,
          image: user.image,
          registerSource: user.registerSource,
          avatarType: user.avatarType,
          groupId: user.groupId,
          linkedEmails: user.linkedEmails || [],
          linkedPhones: user.linkedPhones || [],
          linkedProviders: user.linkedProviders || [],
          hasLinkedAccounts: authResult.hasLinkedAccounts,
          twoFactorEnabled: user.twoFactorEnabled || false
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/sign-in',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'google' || account?.provider === 'github') {
          console.log(`🔗 OAuth signIn attempt with ${account.provider} for email: ${user.email}`)
          
          const client = await clientPromise
          const users = client.db().collection('users')
          
          const existingUser = await users.findOne({ email: user.email })
          
          if (existingUser) {
            console.log(`✅ Found existing user with email ${user.email}, linking account...`)
            
            // Update existing user with OAuth provider
            const updateData = {
              linkedProviders: existingUser.linkedProviders 
                ? [...new Set([...existingUser.linkedProviders, account.provider])]
                : [account.provider],
              updatedAt: new Date(),
              lastSignIn: new Date()
            }
    
            // Update avatar if better quality available
            if (existingUser.avatarType === 'default' && user.image) {
              updateData.image = user.image
              updateData.avatarType = 'oauth'
            }
    
            await users.updateOne(
              { _id: existingUser._id },
              { $set: updateData }
            )
            
            // Set the user ID to the existing user
            user.id = existingUser._id.toString()
            user.registerSource = existingUser.registerSource
            user.groupId = existingUser.groupId
            user.linkedEmails = existingUser.linkedEmails || []
            user.linkedPhones = existingUser.linkedPhones || []
            user.linkedProviders = updateData.linkedProviders
            user.hasLinkedAccounts = true
    
            console.log(`✅ Successfully linked ${account.provider} to existing user ${existingUser._id}`)
    
            // Track OAuth provider linking to existing account
            await ActivityTracker.track(
              existingUser._id.toString(),
              'security_oauth_added',
              `Linked ${account.provider} account`,
              { 
                provider: account.provider,
                email: user.email,
                linkedToExisting: true
              }
            )
          } else {
            console.log(`🆕 New OAuth user with ${account.provider}, creating account...`)
            
            // Handle new OAuth users with enhanced account linking
            const linkingResult = await EnhancedAccountLinkingService.linkOAuthAccount({
              email: user.email!,
              provider: account.provider,
              providerAccountId: account.providerAccountId!,
              name: user.name || profile?.name,
              image: user.image || profile?.image
            })
    
            if (!linkingResult.success) {
              console.error('OAuth account linking failed:', linkingResult.error)
              return false
            }
    
            console.log(`✅ OAuth account linking completed for new user`)
          }
        }
    
        // Track successful sign in for all providers
        if (user.id) {
          await ActivityTracker.track(
            user.id,
            'auth_signin',
            `Successful sign in with ${account?.provider || 'credentials'}`,
            { 
              provider: account?.provider || 'credentials',
              email: user.email,
              hasLinkedAccounts: user.hasLinkedAccounts || false
            }
          )
        }
    
        return true
      } catch (error) {
        console.error('SignIn callback error:', error)
        return false
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.registerSource = user.registerSource
        token.avatarType = user.avatarType
        token.twoFactorEnabled = user.twoFactorEnabled
        token.groupId = user.groupId
        token.hasLinkedAccounts = user.hasLinkedAccounts
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.registerSource = token.registerSource as string
        session.user.avatarType = token.avatarType as string
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean
        
        // Add enhanced session data
        session.user.groupId = token.groupId as string
        session.user.hasLinkedAccounts = token.hasLinkedAccounts as boolean
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
}