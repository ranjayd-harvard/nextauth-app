// src/app/auth/signin/page.tsx - COMPACT VERSION
'use client'

import { getProviders, signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SignIn() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [providers, setProviders] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error_param = searchParams.get('error')
  const message_param = searchParams.get('message')

  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  useEffect(() => {
    if (error_param === 'CredentialsSignin') {
      setError('Invalid email or password')
    }
    
    if (message_param === 'email-verified') {
      setSuccessMessage('Email verified! You can now sign in.')
    } else if (message_param === 'password-reset') {
      setSuccessMessage('Password reset! Sign in with your new password.')
    } else if (message_param === 'phone-verified') {
      setSuccessMessage('Phone verified! You can now sign in.')
    }
  }, [error_param, message_param])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        if (result.error.includes('registered with')) {
          setError(result.error)
        } else {
          setError('Invalid email or password')
        }
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-sm w-full space-y-6">
        {/* Header - Compact */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
          <p className="mt-1 text-sm text-gray-600">
            New here?{' '}
            <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
              Create account
            </Link>
          </p>
        </div>

        {/* Success Message - Compact */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-xs text-green-600">{successMessage}</div>
          </div>
        )}

        {/* Email/Password Form - Compact */}
        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-3">
            <div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Password"
              />
            </div>
          </div>

          {/* Forgot Password Link - Compact */}
          <div className="text-right">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          {/* Error Message - Compact */}
          {error && (
            <div className="text-red-600 text-xs text-center">{error}</div>
          )}

          {/* Email Sign-in Button - Compact */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider - Minimal */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gray-50 text-gray-500">or</span>
          </div>
        </div>

        {/* OAuth Providers - Compact Grid Layout */}
        <div className="grid grid-cols-2 gap-3">
          {providers &&
            Object.values(providers)
              .filter((provider: any) => 
                provider.id !== 'credentials' && 
                provider.id !== 'phone' &&
                provider.type === 'oauth'
              )
              .map((provider: any) => (
                <button
                  key={provider.name}
                  onClick={() => signIn(provider.id, { callbackUrl })}
                  className={`flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                    provider.name === 'Google'
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-gray-800 hover:bg-gray-900 focus:ring-gray-500'
                  }`}
                >
                  {provider.name === 'Google' ? (
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  {provider.name}
                </button>
              ))}
        </div>

        {/* Phone Sign-in - Compact */}
        <Link
          href="/auth/signin-phone"
          className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
          Sign in with Phone
        </Link>

        {/* Quick Links - Compact */}
        <div className="text-center text-xs text-gray-500 space-x-4">
          <Link href="/auth/register" className="hover:text-gray-700">Register</Link>
          <span>•</span>
          <Link href="/auth/register-phone" className="hover:text-gray-700">Register Phone</Link>
        </div>
      </div>
    </div>
  )
}

// Alternative: Super Compact Version with Icon-only OAuth
export function SuperCompactSignIn() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [providers, setProviders] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    if (session) {
      router.push(callbackUrl)
    }
  }, [session, router, callbackUrl])

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    fetchProviders()
  }, [])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid credentials')
      } else {
        router.push(callbackUrl)
      }
    } catch (error) {
      setError('Sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (session) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xs space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Sign In</h2>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500"
            required
          />
          
          {error && <div className="text-xs text-red-600 text-center">{error}</div>}
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-2 bg-gray-50 text-xs text-gray-500">or</span>
          </div>
        </div>

        {/* OAuth - Icon Only */}
        <div className="flex justify-center space-x-3">
          {providers &&
            Object.values(providers)
              .filter((provider: any) => 
                provider.id !== 'credentials' && 
                provider.id !== 'phone' &&
                provider.type === 'oauth'
              )
              .map((provider: any) => (
                <button
                  key={provider.name}
                  onClick={() => signIn(provider.id, { callbackUrl })}
                  className={`p-2 rounded-md text-white hover:opacity-80 transition-opacity ${
                    provider.name === 'Google' ? 'bg-red-600' : 'bg-gray-800'
                  }`}
                  title={`Sign in with ${provider.name}`}
                >
                  {provider.name === 'Google' ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                </button>
              ))}
          
          {/* Phone Icon */}
          <Link
            href="/auth/signin-phone"
            className="p-2 bg-blue-600 text-white rounded-md hover:opacity-80 transition-opacity"
            title="Sign in with Phone"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </Link>
        </div>

        {/* Quick Links */}
        <div className="text-center">
          <Link href="/auth/register" className="text-xs text-blue-600 hover:underline">
            Create Account
          </Link>
          <span className="mx-2 text-xs text-gray-400">•</span>
          <Link href="/auth/forgot-password" className="text-xs text-blue-600 hover:underline">
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  )
}