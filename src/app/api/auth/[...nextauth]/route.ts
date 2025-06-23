import NextAuth from 'next-auth'
import { enhancedAuthOptions } from '@/lib/enhanced-auth'  // Changed from authOptions

const handler = NextAuth(enhancedAuthOptions)  // Changed from authOptions

export { handler as GET, handler as POST }