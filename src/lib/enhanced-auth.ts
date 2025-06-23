// src/lib/enhanced-auth.ts
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

export const enhancedAuthOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Use enhanced authentication to find user with group support
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          email: credentials.email
        })

        if (!authResult?.user) {
          return null
        }

        const user = authResult.user

        // Check if user registered with OAuth but trying to sign in with credentials
        if (!user.password && user.registerSource !== 'credentials') {
          throw new Error(`This email is registered with ${user.registerSource}. Please use ${user.registerSource} to sign in.`)
        }

        if (!user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        
        if (!isPasswordValid) {
          return null
        }

        // Update user activity
        await EnhancedAuthIntegration.updateUserActivity(user._id.toString())

        return {
          id: user._id.toString(),
          email: user.email || user.primaryEmail,
          phoneNumber: user.phoneNumber || user.primaryPhone,
          name: user.name,
          image: user.image,
          registerSource: user.registerSource,
          avatarType: user.avatarType,
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
      async authorize(credentials) {
        console.log('🔐 Phone provider authorize called with:', credentials)
        
        if (!credentials?.phoneNumber || !credentials?.code) {
          console.log('🔐 Missing credentials')
          return null
        }

        // Use enhanced authentication to find user with group support
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          phoneNumber: credentials.phoneNumber
        })

        if (!authResult?.user) {
          console.log('🔐 User not found:', credentials.phoneNumber)
          return null
        }

        const user = authResult.user

        if (!user.phoneVerified) {
          console.log('🔐 Phone not verified for user:', user._id)
          throw new Error('Phone number is not verified')
        }

        console.log('🔐 Verifying code with Twilio...')

        // Verify code using Twilio Verify
        const { verifyCode } = await import('@/lib/sms')
        const verificationResult = await verifyCode(credentials.phoneNumber, credentials.code)
        
        if (!verificationResult.success) {
          console.log('🔐 Code verification failed:', verificationResult.error)
          throw new Error('Invalid or expired login code')
        }

        console.log('🔐 Phone authentication successful for user:', user._id)

        // Update user activity
        await EnhancedAuthIntegration.updateUserActivity(user._id.toString())

        return {
          id: user._id.toString(),
          phoneNumber: user.phoneNumber || user.primaryPhone,
          email: user.email || user.primaryEmail,
          name: user.name,
          image: user.image,
          registerSource: user.registerSource,
          avatarType: user.avatarType,
          groupId: user.groupId,
          linkedEmails: user.linkedEmails || [],
          linkedPhones: user.linkedPhones || [],
          linkedProviders: user.linkedProviders || [],
          hasLinkedAccounts: authResult.hasLinkedAccounts
        }
      }
    }),    
  ],
  pages: {
    signIn: '/auth/sign-in',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const client = await clientPromise
        const users = client.db().collection('users')
        
        // Use enhanced service to find user with group support
        const existingUser = await EnhancedAccountLinkingService.findUserByIdentifierWithGroup(user.email)
        
        if (existingUser) {
          // Check for auto-linking opportunities
          const autoLinkResult = await EnhancedAccountLinkingService.autoLinkIfConfident(
            existingUser._id.toString(),
            user.email,
            undefined, // no phone
            user.name || '',
            95 // High confidence for OAuth linking
          )

          if (autoLinkResult.linked) {
            console.log(`🔗 OAuth auto-linked user ${existingUser._id} into group ${autoLinkResult.groupId}`)
          }

          // Update OAuth linking data
          const updateData: any = {
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
          
          user.id = existingUser._id.toString()
          user.groupId = existingUser.groupId || autoLinkResult.groupId
          return true
        } else {
          // New OAuth user - check for linking opportunities during creation
          console.log('🔗 New OAuth user - checking for linking opportunities...')
        }
      }
      return true
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.provider = account.provider
      }
      if (user) {
        token.id = user.id
        token.registerSource = user.registerSource
        token.picture = user.image
        token.avatarType = user.avatarType
        token.phoneNumber = user.phoneNumber
        token.groupId = user.groupId
        token.linkedEmails = user.linkedEmails
        token.linkedPhones = user.linkedPhones
        token.linkedProviders = user.linkedProviders
        token.hasLinkedAccounts = user.hasLinkedAccounts
      }
      
      // For OAuth users, get the latest data from database including group info
      if (account && (account.provider === 'google' || account.provider === 'github') && user.email) {
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          email: user.email
        })
        
        if (authResult?.user) {
          token.registerSource = authResult.user.registerSource
          token.id = authResult.user._id.toString()
          token.picture = authResult.user.image
          token.avatarType = authResult.user.avatarType
          token.groupId = authResult.user.groupId
          token.linkedEmails = authResult.user.linkedEmails || []
          token.linkedPhones = authResult.user.linkedPhones || []
          token.linkedProviders = authResult.user.linkedProviders || []
          token.hasLinkedAccounts = authResult.hasLinkedAccounts
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.registerSource = token.registerSource as string
        session.user.provider = token.provider as string
        session.user.image = token.picture as string
        session.user.avatarType = token.avatarType as string
        session.user.phoneNumber = token.phoneNumber as string
        session.user.groupId = token.groupId as string
        session.user.linkedEmails = token.linkedEmails as string[]
        session.user.linkedPhones = token.linkedPhones as string[]
        session.user.linkedProviders = token.linkedProviders as string[]
        session.user.hasLinkedAccounts = token.hasLinkedAccounts as boolean
        session.accessToken = token.accessToken
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      const client = await clientPromise
      const users = client.db().collection('users')
      
      // Initialize user with enhanced linking structure
      const updateData: any = {
        registerSource: 'oauth',
        avatarType: 'oauth',
        createdAt: new Date(),
        updatedAt: new Date(),
        linkedProviders: [],
        linkedEmails: user.email ? [user.email] : [],
        linkedPhones: [],
        accountStatus: 'active',
        emailVerified: true // OAuth users are pre-verified
      }

      // Check for auto-linking opportunities for new OAuth users
      if (user.email) {
        console.log(`🔗 Checking auto-linking for new OAuth user: ${user.email}`)
        
        const linkingSuggestion = await EnhancedAccountLinkingService.suggestAccountLinking(
          user.email,
          undefined,
          user.name || ''
        )

        if (linkingSuggestion.shouldSuggest && linkingSuggestion.confidence >= 95) {
          console.log(`🔗 High confidence linking found (${linkingSuggestion.confidence}%) - attempting auto-link`)
          
          const autoLinkResult = await EnhancedAccountLinkingService.autoLinkIfConfident(
            user.id,
            user.email,
            undefined,
            user.name || '',
            95
          )

          if (autoLinkResult.linked) {
            updateData.groupId = autoLinkResult.groupId
            console.log(`✅ OAuth user ${user.id} auto-linked into group ${autoLinkResult.groupId}`)
          }
        }
      }

      const existingUser = await users.findOne({ email: user.email })
      if (!existingUser || !existingUser.registerSource) {
        await users.updateOne(
          { email: user.email },
          { $set: updateData }
        )
      }
    },
    async signIn({ user, account, profile, isNewUser }) {
      // Update user activity on every sign-in
      if (user.id) {
        await EnhancedAuthIntegration.updateUserActivity(user.id)
      }
    }
  },
  session: {
    strategy: 'jwt',
  },
}

// Enhanced session type declaration
declare module 'next-auth' {
  interface User {
    registerSource?: string
    avatarType?: string
    phoneNumber?: string
    groupId?: string
    linkedEmails?: string[]
    linkedPhones?: string[]
    linkedProviders?: string[]
    hasLinkedAccounts?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      registerSource?: string
      provider?: string
      avatarType?: string
      phoneNumber?: string
      groupId?: string
      linkedEmails?: string[]
      linkedPhones?: string[]
      linkedProviders?: string[]
      hasLinkedAccounts?: boolean
    }
    accessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    registerSource?: string
    provider?: string
    picture?: string
    avatarType?: string
    phoneNumber?: string
    groupId?: string
    linkedEmails?: string[]
    linkedPhones?: string[]
    linkedProviders?: string[]
    hasLinkedAccounts?: boolean
    accessToken?: string
  }
}