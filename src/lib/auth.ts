import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import bcrypt from 'bcryptjs'
import clientPromise from './db'
import { TokenManager } from './tokens'
import { verifyCode } from './sms'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const client = await clientPromise
        const users = client.db().collection('users')
        
        const user = await users.findOne({ email: credentials.email })
        
        if (!user) {
          return null
        }

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
      async authorize(credentials) {
        console.log('🔐 Phone provider authorize called with:', credentials)
        
        if (!credentials?.phoneNumber || !credentials?.code) {
          console.log('🔐 Missing credentials')
          return null
        }
    
        const client = await clientPromise
        const users = client.db().collection('users')
        
        const user = await users.findOne({ phoneNumber: credentials.phoneNumber })
        
        if (!user) {
          console.log('🔐 User not found:', credentials.phoneNumber)
          return null
        }
    
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
    
        return {
          id: user._id.toString(),
          phoneNumber: user.phoneNumber,
          name: user.name,
          image: user.image,
          email: user.email || null, // Phone users might not have email
          registerSource: user.registerSource,
          avatarType: user.avatarType,
        }
      }
    }),    
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
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
          return true
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
    },
  },
  session: {
    strategy: 'jwt',
  },
}
