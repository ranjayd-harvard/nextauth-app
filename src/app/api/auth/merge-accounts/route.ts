import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AccountLinkingService } from '@/lib/account-linking'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { targetUserId, confirmMerge } = await req.json()

    if (!confirmMerge) {
      return NextResponse.json(
        { error: 'Merge confirmation required' },
        { status: 400 }
      )
    }

    const result = await AccountLinkingService.mergeAccounts(
      session.user.id,
      targetUserId
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Accounts merged successfully!'
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Merge failed:', error)
    return NextResponse.json(
      { error: 'Failed to merge accounts' },
      { status: 500 }
    )
  }
}
