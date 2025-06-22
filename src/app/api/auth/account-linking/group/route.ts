import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAccountLinkingService } from '@/lib/enhanced-account-linking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    const accounts = await EnhancedAccountLinkingService.getGroupAccounts(groupId)

    // Security check: ensure current user belongs to this group
    const userInGroup = accounts.some(account => account._id.toString() === session.user.id)
    if (!userInGroup) {
      return NextResponse.json(
        { error: 'You do not have access to this group' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      groupId,
      accounts,
      total: accounts.length,
      activeAccounts: accounts.filter(a => a.isActive).length,
      mergedAccounts: accounts.filter(a => !a.isActive).length
    })
  } catch (error) {
    console.error('Get group accounts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { userId } = await req.json()
    const targetUserId = userId || session.user.id

    if (targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only create groups for your own account' },
        { status: 403 }
      )
    }

    const result = await EnhancedAccountLinkingService.createAccountGroup(targetUserId)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Account group created successfully',
        groupId: result.groupId
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Create group error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

