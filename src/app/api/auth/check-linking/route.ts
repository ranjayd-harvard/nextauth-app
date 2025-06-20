import { NextRequest, NextResponse } from 'next/server'
import { AccountLinkingService } from '@/lib/account-linking'

export async function POST(req: NextRequest) {
  try {
    const { email, phoneNumber, name, currentUserId } = await req.json()

    const candidates = await AccountLinkingService.findLinkingCandidates(
      email,
      phoneNumber,
      name,
      currentUserId
    )

    return NextResponse.json({
      hasMatches: candidates.length > 0,
      candidates,
      message: candidates.length > 0 
        ? `Found ${candidates.length} potential account${candidates.length > 1 ? 's' : ''} to link`
        : 'No matching accounts found'
    })

  } catch (error) {
    console.error('Check linking failed:', error)
    return NextResponse.json(
      { error: 'Failed to check for account linking' },
      { status: 500 }
    )
  }
}
