'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AccountLinkingModal from '@/components/AccountLinkingModal' // ADD THIS IMPORT

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [registrationComplete, setRegistrationComplete] = useState(false)
  
  // ADD THESE NEW STATE VARIABLES
  const [showLinkingModal, setShowLinkingModal] = useState(false)
  const [linkingCandidates, setLinkingCandidates] = useState([])
  const [pendingRegistration, setPendingRegistration] = useState(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // UPDATE THIS FUNCTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
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
        setSuccess(data.message)
        setRegistrationComplete(true)
        
        if (!data.requiresVerification) {
          setTimeout(() => {
            router.push('/auth/sign-in')
          }, 2000)
        }
      } else {
        setError(data.error || 'An error occurred')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
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
        setSuccess('Accounts linked successfully! You can now sign in with email or your other methods.')
        setShowLinkingModal(false)
        setRegistrationComplete(true)
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
      // Proceed with normal registration
      const res = await fetch('/api/auth/register', {
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
        setSuccess(data.message)
        setRegistrationComplete(true)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Check your email!</h3>
              <p className="mt-2 text-gray-600">{success}</p>
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    📧 We've sent a verification link to <strong>{formData.email}</strong>
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Please check your email and click the verification link to activate your account.
                  </p>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/auth/sign-in"
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Sign In
                  </Link>
                  <button
                    onClick={() => {
                      setRegistrationComplete(false)
                      setSuccess('')
                      setError('')
                    }}
                    className="block w-full text-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Register Different Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/auth/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password (min. 6 characters)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            By creating an account, you agree to receive email notifications for account verification and password resets.
          </div>
        </form>

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
