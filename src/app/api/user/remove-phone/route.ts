// src/app/api/user/remove-phone/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { enhancedAuthOptions as authOptions } from '@/lib/enhanced-auth'
import clientPromise from '@/lib/db'
import { ObjectId } from 'mongodb'

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { phoneNumber, isPrimary } = await req.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log('📱 Remove phone request for user:', session.user.id, { phoneNumber, isPrimary })

    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Get current user
    const user = await users.findOne({ _id: new ObjectId(session.user.id) })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent removing primary phone
    if (isPrimary || user.phoneNumber === phoneNumber) {
      return NextResponse.json(
        { error: 'Cannot remove primary phone number. Please set another phone as primary first.' },
        { status: 400 }
      )
    }

    // Check if user has other verified authentication methods
    const hasOtherMethods = user.emailVerified || 
                           (user.linkedProviders && user.linkedProviders.length > 0) ||
                           (user.verifiedEmails && user.verifiedEmails.length > 0) ||
                           (user.verifiedPhones && user.verifiedPhones.length > 1)

    if (!hasOtherMethods) {
      return NextResponse.json(
        { error: 'Cannot remove phone. You must have at least one verified authentication method.' },
        { status: 400 }
      )
    }

    // Check if phone exists in linkedPhones or verifiedPhones
    const phoneInLinked = user.linkedPhones && user.linkedPhones.includes(phoneNumber)
    const phoneInVerified = user.verifiedPhones && user.verifiedPhones.includes(phoneNumber)

    if (!phoneInLinked && !phoneInVerified) {
      return NextResponse.json(
        { error: 'Phone number not found in your linked phones' },
        { status: 404 }
      )
    }

    console.log('📱 Removing phone from user account...')

    // Remove phone from both linkedPhones and verifiedPhones arrays
    const updateResult = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $pull: { 
          linkedPhones: phoneNumber,
          verifiedPhones: phoneNumber
        },
        $set: { 
          updatedAt: new Date() 
        }
      }
    )

    if (updateResult.matchedCount === 0) {
      console.error('📱 Failed to remove phone from user')
      return NextResponse.json(
        { error: 'Failed to remove phone from account' },
        { status: 500 }
      )
    }

    // Log security event
    await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      { 
        $push: { 
          securityLog: {
            event: 'phone_removed',
            timestamp: new Date(),
            phoneNumber: phoneNumber,
            ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
            userAgent: req.headers.get('user-agent') || 'unknown'
          }
        }
      }
    )

    console.log('📱 Phone removed successfully:', phoneNumber)

    return NextResponse.json(
      { 
        success: true,
        message: `Phone ${phoneNumber} removed from account successfully`,
        phoneNumber: phoneNumber
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Remove phone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}