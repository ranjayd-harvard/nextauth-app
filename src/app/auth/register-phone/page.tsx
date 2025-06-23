'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AccountLinkingModal from '@/components/AccountLinkingModal' // ADD THIS IMPORT

export default function RegisterPhone() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    countryCode: 'US',
  })
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [registeredPhone, setRegisteredPhone] = useState('')
  
  // ADD THESE NEW STATE VARIABLES
  const [showLinkingModal, setShowLinkingModal] = useState(false)
  const [linkingCandidates, setLinkingCandidates] = useState([])
  const [pendingRegistration, setPendingRegistration] = useState(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // UPDATE THIS FUNCTION
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      // ADD THIS LINKING CHECK
      if (data.requiresLinking) {
        console.log('🔗 Account linking required:', data.candidates)
        setLinkingCandidates(data.candidates)
        setPendingRegistration(data.registrationData)
        setShowLinkingModal(true)
        setIsLoading(false)
        return
      }

      if (res.ok) {
        setRegisteredPhone(data.phoneNumber)
        setStep('verify')
      } else {
        setError(data.error || 'An error occurred')
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
      const res = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: registeredPhone,
          code: verificationCode,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/auth/sign-in?message=phone-verified')
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resendCode = async () => {
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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

  // ADD THIS NEW FUNCTION
  const handleMergeAccounts = async (targetUserId: string) => {
    try {
      console.log('🔗 Attempting to merge with account:', targetUserId)
      
      const response = await fetch('/api/auth/merge-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          confirmMerge: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        // After successful merge, proceed with phone registration
        setShowLinkingModal(false)
        const res = await fetch('/api/auth/register-phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...pendingRegistration,
            linkedAccount: true
          }),
        })

        const regData = await res.json()
        if (res.ok) {
          setRegisteredPhone(regData.phoneNumber)
          setStep('verify')
        } else {
          setError('Registration failed after linking')
        }
      } else {
        setError(data.error || 'Failed to link accounts')
      }
    } catch (error) {
      console.error('Merge failed:', error)
      setError('Failed to link accounts. Please try again.')
    }
  }

  // ADD THIS NEW FUNCTION
  const handleSkipLinking = async () => {
    setShowLinkingModal(false)
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pendingRegistration,
          skipLinking: true
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setRegisteredPhone(data.phoneNumber)
        setStep('verify')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Register with Phone' : 'Verify Your Phone'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              register with email
            </Link>
            {' or '}
            <Link href="/auth/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
              sign in
            </Link>
          </p>
        </div>

        {step === 'phone' ? (
          <form className="mt-8 space-y-6" onSubmit={handlePhoneSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="countryCode"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
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
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Phone number"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your phone number (e.g., 1234567890 or +1234567890)
                </p>
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
                {isLoading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifySubmit}>
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Check your phone</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We've sent a 6-digit verification code to<br />
                  <span className="font-medium">{registeredPhone}</span>
                </p>
              </div>

              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Verification Code
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
                <p className="mt-1 text-xs text-gray-500 text-center">
                  Enter the 6-digit code sent to your phone
                </p>
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
                {isLoading ? 'Verifying...' : 'Verify Phone Number'}
              </button>

              <button
                type="button"
                onClick={resendCode}
                disabled={isLoading}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
              >
                Didn't receive the code? Resend
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

        {/* ADD THE MODAL HERE - RIGHT BEFORE THE FINAL CLOSING DIV */}
        <AccountLinkingModal
          isOpen={showLinkingModal}
          onClose={() => setShowLinkingModal(false)}
          candidates={linkingCandidates}
          onMerge={handleMergeAccounts}
        />
      </div>
    </div>
  )
}
