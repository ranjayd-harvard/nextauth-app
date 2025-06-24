import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './db'
import { TokenManager } from './tokens'
import { verifyCode } from './sms'
import { ActivityTracker } from '@/lib/activity-tracker'
import { EnhancedAuthIntegration } from '@/lib/enhanced-auth-integration'

export const authOptions: NextAuthOptions = {
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const client = await clientPromise
        const users = client.db().collection('users')
        
        const user = await users.findOne({ email: credentials.email })
        
        if (!user) {
          // Track failed login attempt - user not found
          await ActivityTracker.track(
            credentials.email, // Use email as identifier when user not found
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

        // Check if user registered with OAuth but trying to sign in with credentials
        if (!user.password && user.registerSource !== 'credentials') {
          // Track failed login attempt - wrong provider
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
          // Track failed login attempt - no password set
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
          // Track failed login attempt - invalid password
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

        // Successful authentication - activity will be tracked in signIn callback
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          registerSource: user.registerSource,
          avatarType: user.avatarType,
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
          console.log('🔐 Missing credentials')
          return null
        }
    
        // CRITICAL: Format phone number before looking up user
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
    
        // Format the phone number to match what's stored in database
        const formattedPhone = formatPhoneNumber(credentials.phoneNumber)
        console.log('🔐 Looking for user with formatted phone:', formattedPhone)
    
        // Use enhanced authentication to find user with group support
        const authResult = await EnhancedAuthIntegration.authenticateUserWithGroup({
          phoneNumber: formattedPhone  // Use formatted phone number
        })
    
        if (!authResult?.user) {
          console.log('🔐 User not found with formatted phone:', formattedPhone)
          // Track failed phone login - user not found
          await ActivityTracker.track(
            formattedPhone, // Use phone as identifier when user not found
            'auth_failed_login',
            'Failed phone login - user not found',
            { 
              reason: 'user_not_found', 
              phoneNumber: formattedPhone,
              provider: 'phone'
            },
            req
          )
          return null
        }
    
        const user = authResult.user
    
        if (!user.phoneVerified) {
          console.log('🔐 Phone not verified for user:', user._id)
          // Track failed phone login - phone not verified
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            'Failed phone login - phone not verified',
            { 
              reason: 'phone_not_verified', 
              phoneNumber: formattedPhone 
            },
            req
          )
          throw new Error('Phone number is not verified')
        }
    
        console.log('🔐 Verifying code with Twilio...')
    
        // Verify code using Twilio Verify (use formatted phone number)
        const { verifyCode } = await import('@/lib/sms')
        const verificationResult = await verifyCode(formattedPhone, credentials.code)
        
        if (!verificationResult.success) {
          console.log('🔐 Code verification failed:', verificationResult.error)
          // Track failed phone login - invalid code
          await ActivityTracker.track(
            user._id.toString(),
            'auth_failed_login',
            'Failed phone login - invalid verification code',
            { 
              reason: 'invalid_code', 
              phoneNumber: formattedPhone,
              error: verificationResult.error 
            },
            req
          )
          throw new Error('Invalid or expired login code')
        }
    
        console.log('🔐 Phone authentication successful for user:', user._id)
    
        // Update user activity
        await EnhancedAuthIntegration.updateUserActivity(user._id.toString())
    
        // Successful phone authentication - activity will be tracked in signIn callback
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
      try {
        if (account?.provider === 'google' || account?.provider === 'github') {
          const client = await clientPromise
          const users = client.db().collection('users')
          
          const existingUser = await users.findOne({ email: user.email })
          
          if (existingUser && existingUser.registerSource === 'credentials' && existingUser.password) {
            await users.updateOne(
              { _id: existingUser._id },
              { 
                $set: { 
                  registerSource: 'credentials',
                  linkedProviders: existingUser.linkedProviders 
                    ? [...new Set([...existingUser.linkedProviders, account.provider])]
                    : [account.provider],
                  updatedAt: new Date(),
                  ...(existingUser.avatarType === 'default' && user.image && { 
                    image: user.image,
                    avatarType: 'oauth' 
                  }),
                }
              }
            )
            
            user.id = existingUser._id.toString()

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
          }
        }

        // Track successful sign-in for all providers
        if (user.id) {
          // Track the sign-in event
          await ActivityTracker.trackSignIn(user.id, account?.provider || 'credentials')
        }
        
        return true
      } catch (error) {
        console.error('❌ SignIn callback error:', error)
        
        // Track sign-in error
        if (user.id) {
          await ActivityTracker.track(
            user.id,
            'auth_failed_login',
            'Sign-in callback error',
            { 
              reason: 'callback_error',
              provider: account?.provider,
              error: error.message 
            }
          )
        }
        
        return false
      }
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
      }
      
      // For OAuth users, get the registration source from database
      if (account && (account.provider === 'google' || account.provider === 'github') && user.email) {
        const client = await clientPromise
        const users = client.db().collection('users')
        const dbUser = await users.findOne({ email: user.email })
        if (dbUser) {
          token.registerSource = dbUser.registerSource
          token.id = dbUser._id.toString()
          token.picture = dbUser.image
          token.avatarType = dbUser.avatarType
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
        session.accessToken = token.accessToken
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      try {
        const client = await clientPromise
        const users = client.db().collection('users')
        
        const existingUser = await users.findOne({ email: user.email })
        if (!existingUser || !existingUser.registerSource) {
          await users.updateOne(
            { email: user.email },
            { 
              $set: { 
                registerSource: 'oauth',
                avatarType: 'oauth',
                createdAt: new Date(),
                updatedAt: new Date(),
                linkedProviders: []
              }
            }
          )
        }

        // Track account creation
        if (user.id) {
          await ActivityTracker.track(
            user.id,
            'account_created',
            'Account created via OAuth',
            { 
              email: user.email,
              name: user.name,
              method: 'oauth'
            }
          )
        }
      } catch (error) {
        console.error('❌ CreateUser event error:', error)
      }
    },
    async signOut({ session, token }) {
      try {
        const userId = session?.user?.id || token?.id as string
        if (userId) {
          await ActivityTracker.trackSignOut(userId)
        }
      } catch (error) {
        console.error('❌ SignOut event error:', error)
      }
    },
    async linkAccount({ user, account }) {
      try {
        if (user.id && account) {
          await ActivityTracker.track(
            user.id,
            'security_oauth_added',
            `Linked ${account.provider} account`,
            { 
              provider: account.provider,
              accountId: account.id
            }
          )
        }
      } catch (error) {
        console.error('❌ LinkAccount event error:', error)
      }
    },
    async session({ session, token }) {
      try {
        // Track session activity periodically (optional)
        const userId = session?.user?.id || token?.id as string
        if (userId) {
          // You can add periodic session tracking here if needed
          // For example, track every hour of activity
        }
      } catch (error) {
        console.error('❌ Session event error:', error)
      }
    }
  },
  session: {
    strategy: 'jwt',
  },
}