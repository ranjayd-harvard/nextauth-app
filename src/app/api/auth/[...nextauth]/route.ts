import NextAuth from 'next-auth'
import { enhancedAuthOptions } from '@/lib/enhanced-auth'  // Changed from authOptions
import { ActivityTracker } from '@/lib/activity-tracker'

const handler = NextAuth(enhancedAuthOptions)  // Changed from authOptions

export { handler as GET, handler as POST }