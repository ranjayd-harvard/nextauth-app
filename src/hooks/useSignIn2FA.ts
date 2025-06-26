// src/hooks/useSignIn2FA.ts
import { useState } from 'react'
import { signIn } from 'next-auth/react'

interface SignInFormData {
  email: string
  password: string
  twoFactorCode?: string
}

interface SignInResult {
  success: boolean
  requires2FA?: boolean
  requiresOAuth?: boolean
  provider?: string
  error?: string
}

export const useSignIn2FA = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const checkUser2FA = async (email: string): Promise<{
    requires2FA: boolean
    exists: boolean
    hasPassword: boolean
    requiresOAuth?: boolean
    provider?: string
    error?: string
  }> => {
    try {
      const response = await fetch('/api/auth/check-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      
      if (!data.success && data.requiresOAuth) {
        return {
          requires2FA: false,
          exists: true,
          hasPassword: false,
          requiresOAuth: true,
          provider: data.provider,
          error: data.error
        }
      }

      return {
        requires2FA: data.requires2FA || false,
        exists: data.exists || false,
        hasPassword: data.hasPassword || false
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      return {
        requires2FA: false,
        exists: false,
        hasPassword: false,
        error: 'Failed to check user status'
      }
    }
  }

  const signInWithCredentials = async (
    formData: SignInFormData,
    callbackUrl: string = '/dashboard'
  ): Promise<SignInResult> => {
    setIsLoading(true)

    try {
      // First, check if user exists and has 2FA enabled
      const userCheck = await checkUser2FA(formData.email)
      
      if (userCheck.requiresOAuth) {
        setIsLoading(false)
        return {
          success: false,
          requiresOAuth: true,
          provider: userCheck.provider,
          error: userCheck.error
        }
      }

      if (!userCheck.exists) {
        setIsLoading(false)
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // If user has 2FA enabled but no code provided yet
      if (userCheck.requires2FA && !formData.twoFactorCode) {
        setRequires2FA(true)
        setUserEmail(formData.email)
        setIsLoading(false)
        return {
          success: false,
          requires2FA: true
        }
      }

      // Attempt sign in with NextAuth
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        twoFactorCode: formData.twoFactorCode,
        redirect: false,
      })

      if (result?.error) {
        if (result.error === '2FA_REQUIRED') {
          setRequires2FA(true)
          setUserEmail(formData.email)
          setIsLoading(false)
          return {
            success: false,
            requires2FA: true
          }
        } else if (result.error.includes('Invalid 2FA code')) {
          setIsLoading(false)
          return {
            success: false,
            error: 'Invalid verification code. Please try again.'
          }
        } else if (result.error.includes('registered with')) {
          setIsLoading(false)
          return {
            success: false,
            requiresOAuth: true,
            error: result.error
          }
        } else {
          setIsLoading(false)
          return {
            success: false,
            error: 'Invalid email or password'
          }
        }
      } else if (result?.ok) {
        // Success - redirect will be handled by NextAuth or manually
        setIsLoading(false)
        return {
          success: true
        }
      }

      setIsLoading(false)
      return {
        success: false,
        error: 'Authentication failed'
      }

    } catch (error) {
      console.error('Sign in error:', error)
      setIsLoading(false)
      return {
        success: false,
        error: 'Something went wrong. Please try again.'
      }
    }
  }

  const reset2FAFlow = () => {
    setRequires2FA(false)
    setUserEmail('')
  }

  return {
    isLoading,
    requires2FA,
    userEmail,
    signInWithCredentials,
    checkUser2FA,
    reset2FAFlow
  }
}