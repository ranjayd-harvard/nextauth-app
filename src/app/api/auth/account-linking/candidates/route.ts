import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAccountLinkingService } from '@/lib/enhanced-account-linking'

export async function POST(req: NextRequest) {
  try {
    const { email, phoneNumber, name, excludeUserId } = await req.json()

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { error: 'At least one identifier (email, phone, or name) is required' },
        { status: 400 }
      )
    }

    const candidates = await EnhancedAccountLinkingService.findLinkingCandidates(
      email,
      phoneNumber,
      name,
      excludeUserId
    )

    return NextResponse.json({
      success: true,
      candidates,
      total: candidates.length
    })
  } catch (error) {
    console.error('Find candidates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}