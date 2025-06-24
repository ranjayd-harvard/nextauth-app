// src/app/auth/verify-linked-email/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyLinkedEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    verifyToken(token)
  }, [searchParams])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/user/verify-linked-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('Your email has been verified successfully!')
        setEmail(data.email)
        
        // Redirect to security page after 3 seconds
        setTimeout(() => {
          router.push('/account/security?email_verified=true')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred during verification')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">📧</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Verifying your email...
              </h3>
              <p className="text-gray-600">
                Please wait while we verify your email address.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                {email && `The email address ${email} has been verified and linked to your account.`}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                You will be redirected to your security settings in a few seconds...
              </p>
              <Link
                href="/account/security"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Security Settings
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link
                  href="/account/security"
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Go to Security Settings
                </Link>
                <Link
                  href="/dashboard"
                  className="block w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/support" className="font-medium text-blue-600 hover:text-blue-500">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}