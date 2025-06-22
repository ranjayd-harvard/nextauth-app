// src/app/api/auth/account-linking/auto-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAccountLinkingService } from '@/lib/enhanced-account-linking'

export async function POST(req: NextRequest) {
  try {
    const { 
      newUserId, 
      email, 
      phoneNumber, 
      name, 
      confidenceThreshold = 98  // Very high threshold for auto-linking
    } = await req.json()

    if (!newUserId) {
      return NextResponse.json(
        { error: 'New user ID is required' },
        { status: 400 }
      )
    }

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { error: 'At least one identifier (email, phone, or name) is required' },
        { status: 400 }
      )
    }

    console.log(`🔗 Auto-link attempt for user ${newUserId} with threshold ${confidenceThreshold}%`)

    const result = await EnhancedAccountLinkingService.autoLinkIfConfident(
      newUserId,
      email,
      phoneNumber,
      name,
      confidenceThreshold
    )

    console.log(`🔗 Auto-link result:`, result)

    return NextResponse.json({
      success: true,
      linked: result.linked,
      groupId: result.groupId,
      message: result.message || (result.linked ? 'Accounts auto-linked successfully' : 'No auto-linking performed'),
      confidenceThreshold,
      identifiers: {
        email: email || null,
        phoneNumber: phoneNumber || null,
        name: name || null
      }
    })

  } catch (error) {
    console.error('Auto-link error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method to check auto-link eligibility without performing the action
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const phoneNumber = searchParams.get('phoneNumber')
    const name = searchParams.get('name')
    const confidenceThreshold = parseInt(searchParams.get('confidenceThreshold') || '98')

    if (!email && !phoneNumber && !name) {
      return NextResponse.json(
        { error: 'At least one identifier is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking auto-link eligibility with threshold ${confidenceThreshold}%`)

    // Get linking suggestions without performing the link
    const suggestion = await EnhancedAccountLinkingService.suggestAccountLinking(
      email || undefined,
      phoneNumber || undefined,
      name || undefined
    )

    const isEligible = suggestion.shouldSuggest && suggestion.confidence >= confidenceThreshold
    const bestCandidate = suggestion.candidates.length > 0 ? suggestion.candidates[0] : null

    // Check if exact match exists for auto-linking
    let hasExactMatch = false
    if (bestCandidate) {
      hasExactMatch = bestCandidate.matchReasons.some(reason => 
        reason.includes('Primary email match') || 
        reason.includes('Primary phone match') ||
        reason.includes('Email match')
      )
    }

    return NextResponse.json({
      success: true,
      eligible: isEligible && hasExactMatch,
      confidence: suggestion.confidence,
      shouldSuggest: suggestion.shouldSuggest,
      candidatesFound: suggestion.candidates.length,
      bestCandidate: bestCandidate ? {
        userId: bestCandidate.userId,
        confidence: bestCandidate.confidence,
        matchReasons: bestCandidate.matchReasons,
        authMethods: bestCandidate.authMethods,
        hasGroupId: !!bestCandidate.groupId
      } : null,
      hasExactMatch,
      confidenceThreshold,
      message: isEligible && hasExactMatch 
        ? `Auto-linking eligible with ${suggestion.confidence}% confidence`
        : `Not eligible for auto-linking (confidence: ${suggestion.confidence}%, exact match: ${hasExactMatch})`
    })

  } catch (error) {
    console.error('Auto-link eligibility check error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT method to update auto-link settings (for admin/testing purposes)
export async function PUT(req: NextRequest) {
  try {
    const { 
      userId,
      enableAutoLink = true,
      confidenceThreshold = 98,
      requireExactMatch = true
    } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // This could be used to store user preferences for auto-linking
    // For now, we'll just return the settings that would be applied
    
    return NextResponse.json({
      success: true,
      message: 'Auto-link settings updated',
      settings: {
        userId,
        enableAutoLink,
        confidenceThreshold,
        requireExactMatch,
        updatedAt: new Date()
      }
    })

  } catch (error) {
    console.error('Update auto-link settings error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}