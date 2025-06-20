// src/lib/sms.ts - FIXED VERSION
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface SMSOptions {
  to: string
  message: string
}

export interface VerifyCodeOptions {
  to: string
  code: string
}

// Send verification code using Twilio Verify (recommended)
export async function sendVerificationCode(phoneNumber: string) {
  try {
    console.log('📱 Sending verification code to:', phoneNumber)

    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      // Use Twilio Verify Service (recommended) - REMOVED customFriendlyName
      console.log('📱 Using Twilio Verify Service...')
      const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications
        .create({ 
          to: phoneNumber, 
          channel: 'sms'
          // Removed customFriendlyName - not supported in all configurations
        })

      console.log('📱 Verification created:', verification.sid, 'Status:', verification.status)
      return { success: true, sid: verification.sid }
    } else {
      // Fallback to basic SMS with custom code
      console.log('📱 Using basic SMS...')
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const message = `Your MyApp verification code is: ${code}. This code expires in 10 minutes.`
      
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      })

      console.log('📱 SMS sent successfully:', result.sid)
      return { success: true, code, sid: result.sid }
    }
  } catch (error) {
    console.error('📱 SMS Error Details:', error)
    
    // Handle specific errors
    if (error.code === 30034) {
      return { 
        success: false, 
        error: 'Phone number not configured for business messaging. Please use Twilio Verify Service.' 
      }
    }
    
    if (error.code === 60204) {
      return {
        success: false,
        error: 'Twilio Verify configuration error. Please check your service settings.'
      }
    }
    
    return { success: false, error: error.message }
  }
}

// Verify code using Twilio Verify
export async function verifyCode(phoneNumber: string, code: string) {
  try {
    console.log('📱 Verifying code for:', phoneNumber)
    
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      // Use Twilio Verify Service
      const verificationCheck = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks
        .create({ to: phoneNumber, code })

      console.log('📱 Verification result:', verificationCheck.status)
      
      return {
        success: verificationCheck.status === 'approved',
        status: verificationCheck.status
      }
    } else {
      // For basic SMS, verification is handled in the API route using TokenManager
      console.log('📱 Using token-based verification')
      return { success: true, status: 'approved' }
    }
  } catch (error) {
    console.error('📱 Code verification failed:', error)
    
    // Handle common verification errors
    if (error.code === 60202) {
      return { success: false, error: 'Invalid verification code' }
    }
    
    if (error.code === 60203) {
      return { success: false, error: 'Verification code has expired' }
    }
    
    return { success: false, error: error.message }
  }
}

// Send SMS using basic Twilio (for non-verification messages)
export async function sendSMS({ to, message }: SMSOptions) {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    })

    console.log('📱 SMS sent successfully:', result.sid)
    return { success: true, sid: result.sid }
  } catch (error) {
    console.error('📱 SMS sending failed:', error)
    return { success: false, error: error.message }
  }
}

// SMS Templates
export const smsTemplates = {
  verificationCode: (code: string) => 
    `Your MyApp verification code is: ${code}. This code expires in 10 minutes. Do not share this code with anyone.`,
  
  loginCode: (code: string) => 
    `Your MyApp login code is: ${code}. This code expires in 5 minutes.`,
  
  passwordReset: (code: string) => 
    `Your MyApp password reset code is: ${code}. This code expires in 10 minutes.`,
}