'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignInPhone() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentPhone, setSentPhone] = useState('')

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          countryCode,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSentPhone(data.phoneNumber)
        setStep('verify')
      } else {
        setError(data.error || 'Failed to send login code')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      console.log('🔐 Attempting phone sign-in with:', { phoneNumber: sentPhone, code: verificationCode })
      
      const result = await signIn('phone', {
        phoneNumber: sentPhone,
        code: verificationCode,
        redirect: false,
      })

      console.log('🔐 Sign-in result:', result)

      if (result?.error) {
        setError(result.error)
      } else if (result?.ok) {
        console.log('🔐 Sign-in successful, redirecting to:', callbackUrl)
        router.push(callbackUrl)
      } else {
        setError('Sign-in failed. Please try again.')
      }
    } catch (error) {
      console.error('🔐 Sign-in error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: sentPhone,
        }),
      })

      if (res.ok) {
        setError('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to resend code')
      }
    } catch (error) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Sign in with Phone' : 'Enter Verification Code'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
              sign in with email
            </Link>
          </p>
        </div>

        {step === 'phone' ? (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="US">🇺🇸 United States (+1)</option>
                  <option value="CA">🇨🇦 Canada (+1)</option>
                  <option value="GB">🇬🇧 United Kingdom (+44)</option>
                  <option value="IN">🇮🇳 India (+91)</option>
                  <option value="AU">🇦🇺 Australia (+61)</option>
                  <option value="DE">🇩🇪 Germany (+49)</option>
                  <option value="FR">🇫🇷 France (+33)</option>
                  <option value="JP">🇯🇵 Japan (+81)</option>
                  <option value="BR">🇧🇷 Brazil (+55)</option>
                  <option value="MX">🇲🇽 Mexico (+52)</option>
                </select>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Phone number"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Sending Code...' : 'Send Login Code'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifySubmit}>
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Code sent!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter the 6-digit code sent to<br />
                  <span className="font-medium">{sentPhone}</span>
                </p>
              </div>

              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Login Code
                </label>
                <input
                  id="verificationCode"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={resendCode}
                disabled={isLoading}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                Resend code
              </button>

              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-center text-sm text-gray-600 hover:text-gray-500"
              >
                Use a different phone number
              </button>
            </div>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/auth/register-phone"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Don't have an account? Register with phone
          </Link>
        </div>
      </div>
    </div>
  )
}
