import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAccountLinkingService } from '@/lib/enhanced-account-linking'

export async function POST(req: NextRequest) {
  try {
    const { email, phoneNumber, name } = await req.json()

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { error: 'At least one identifier is required' },
        { status: 400 }
      )
    }

    const suggestion = await EnhancedAccountLinkingService.suggestAccountLinking(
      email,
      phoneNumber,
      name
    )

    return NextResponse.json({
      success: true,
      shouldSuggest: suggestion.shouldSuggest,
      confidence: suggestion.confidence,
      candidates: suggestion.candidates,
      message: suggestion.shouldSuggest 
        ? `Found ${suggestion.candidates.length} potential account(s) to link`
        : 'No linking suggestions found'
    })
  } catch (error) {
    console.error('Suggest linking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
