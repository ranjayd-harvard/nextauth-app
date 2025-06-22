import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAccountLinkingService } from '@/lib/enhanced-account-linking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { primaryUserId, secondaryUserIds, createNewGroup = true } = await req.json()

    if (!primaryUserId || !Array.isArray(secondaryUserIds) || secondaryUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Primary user ID and array of secondary user IDs are required' },
        { status: 400 }
      )
    }

    // Security check: ensure current user is either primary or one of the secondary users
    const allUserIds = [primaryUserId, ...secondaryUserIds]
    if (!allUserIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'You can only merge accounts that belong to you' },
        { status: 403 }
      )
    }

    const result = await EnhancedAccountLinkingService.mergeAccountsWithGroup(
      primaryUserId,
      secondaryUserIds,
      createNewGroup
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully merged ${result.mergedAccounts} accounts`,
        groupId: result.groupId,
        mergedUserId: result.mergedUserId
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Account merge error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
