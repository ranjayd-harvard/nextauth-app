import { NextRequest, NextResponse } from 'next/server'
import { sendVerificationCode } from '@/lib/sms'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json()
    
    console.log('🧪 Testing SMS to:', phoneNumber)
    
    const result = await sendVerificationCode(phoneNumber)
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test SMS sent!' : 'SMS failed',
      error: result.error,
      sid: result.sid,
      code: result.code // Only for debugging - remove in production
    })
  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
