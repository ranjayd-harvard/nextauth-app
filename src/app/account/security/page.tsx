'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signIn, getProviders } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AccountLinkingModal from '@/components/AccountLinkingModal'
import { useAccountLinking } from '@/hooks/useAccountLinking'

interface AuthMethod {
  id: string
  type: 'email' | 'phone' | 'oauth'
  value: string
  verified: boolean
  primary: boolean
  lastUsed?: string
}

interface UserProfile {
  user: {
    id: string
    name: string
    email: string
    phoneNumber?: string
    linkedEmails?: string[]
    verifiedEmails?: string[]
    linkedPhones?: string[]
    verifiedPhones?: string[]
    phoneVerified?: boolean
    image?: string
    hasLinkedAccounts?: boolean
    linkedAccountsCount?: number
  }
}

// Add Email Modal Component
function AddEmailModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError,
  userProfile 
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
  userProfile: UserProfile | null
}) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Check if email is already linked (verified or unverified)
      const emailExists = userProfile?.user.linkedEmails?.includes(email.toLowerCase()) || 
                         userProfile?.user.email === email.toLowerCase()
      
      if (emailExists) {
        const isVerified = userProfile?.user.verifiedEmails?.includes(email.toLowerCase()) || 
                          userProfile?.user.email === email.toLowerCase()
        
        if (isVerified) {
          onError('This email is already verified and linked to your account')
          setIsLoading(false)
          return
        } else {
          // Email exists but is unverified - offer to resend verification
          if (confirm(`This email is already linked but not verified. Would you like to resend the verification email?`)) {
            const resendResponse = await fetch('/api/user/add-email', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.toLowerCase() })
            })

            const resendData = await resendResponse.json()

            if (resendResponse.ok) {
              onSuccess('Verification email resent successfully!')
              onClose()
              setEmail('')
            } else {
              onError(resendData.error || 'Failed to resend verification email')
            }
          }
          setIsLoading(false)
          return
        }
      }

      const response = await fetch('/api/user/add-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(data.message || 'Email added successfully! Please check your inbox for verification.')
        onClose()
        setEmail('')
      } else {
        onError(data.error || 'Failed to add email')
      }
    } catch (error) {
      onError('Failed to add email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Email Address</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Phone Modal Component
function AddPhoneModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError 
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('US')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  const [isLoading, setIsLoading] = useState(false)

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/user/add-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, countryCode })
      })

      const data = await response.json()

      if (response.ok) {
        setStep('verify')
        onError('') // Clear any previous errors
      } else {
        onError(data.error || 'Failed to add phone number')
      }
    } catch (error) {
      onError('Failed to add phone number. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/user/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber,
          code: verificationCode 
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(data.message || 'Phone number added and verified successfully!')
        onClose()
        setPhoneNumber('')
        setVerificationCode('')
        setStep('phone')
      } else {
        onError(data.error || 'Failed to verify phone number')
      }
    } catch (error) {
      onError('Failed to verify phone number. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetModal = () => {
    setPhoneNumber('')
    setVerificationCode('')
    setStep('phone')
    onError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {step === 'phone' ? 'Add Phone Number' : 'Verify Phone Number'}
          </h3>
          <button
            onClick={() => {
              onClose()
              resetModal()
            }}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        {step === 'phone' ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <select
                id="countryCode"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="US">United States (+1)</option>
                <option value="CA">Canada (+1)</option>
                <option value="GB">United Kingdom (+44)</option>
                <option value="IN">India (+91)</option>
                <option value="AU">Australia (+61)</option>
                <option value="DE">Germany (+49)</option>
                <option value="FR">France (+33)</option>
                <option value="JP">Japan (+81)</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  resetModal()
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                We sent a verification code to <br />
                <span className="font-medium">{phoneNumber}</span>
              </p>
            </div>
            
            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                required
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setStep('phone')}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Add Social Modal Component
function AddSocialModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError 
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}) {
  const [providers, setProviders] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      getProviders().then(setProviders)
    }
  }, [isOpen])

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google': return '🔴'
      case 'github': return '⚫'
      case 'facebook': return '🔵'
      case 'twitter': return '🐦'
      default: return '🌐'
    }
  }

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'google': return 'hover:bg-red-50 border-red-200'
      case 'github': return 'hover:bg-gray-50 border-gray-200'
      case 'facebook': return 'hover:bg-blue-50 border-blue-200'
      case 'twitter': return 'hover:bg-blue-50 border-blue-200'
      default: return 'hover:bg-gray-50 border-gray-200'
    }
  }

  const handleSocialConnect = async (providerId: string) => {
    setIsLoading(true)
    onError('')

    try {
      const result = await signIn(providerId, { 
        redirect: false,
        callbackUrl: '/account/security?social_linked=true'
      })

      if (result?.error) {
        onError('Failed to connect social account. Please try again.')
      } else if (result?.ok) {
        onSuccess('Social account connected successfully!')
        onClose()
      }
    } catch (error) {
      onError('Failed to connect social account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const socialProviders = Object.values(providers).filter(
    (provider: any) => provider.type === 'oauth'
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connect Social Account</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-gray-600 text-center mb-4">
            Choose a social account to connect to your profile
          </p>
          
          {socialProviders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🌐</div>
              <p className="text-gray-600">No social providers available</p>
            </div>
          ) : (
            socialProviders.map((provider: any) => (
              <button
                key={provider.id}
                onClick={() => handleSocialConnect(provider.id)}
                disabled={isLoading}
                className={`w-full flex items-center justify-center space-x-3 py-3 px-4 border-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${getProviderColor(provider.id)}`}
              >
                <span className="text-xl">{getProviderIcon(provider.id)}</span>
                <span>Connect {provider.name}</span>
              </button>
            ))
          )}
          
          <div className="mt-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              This will link your social account with your current profile for easier sign-in.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SecurityPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showAddEmailModal, setShowAddEmailModal] = useState(false)
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false)
  const [showAddSocialModal, setShowAddSocialModal] = useState(false)

  const {
    candidates,
    isLoading: isLinkingLoading,
    error: linkingError,
    showLinkingModal,
    linkAccounts,
    setShowLinkingModal,
    findAccountsToLink
  } = useAccountLinking()

  // Generate auth methods based on current user profile
  const getAuthMethods = (): AuthMethod[] => {
    if (!userProfile?.user) return []
    
    const methods: AuthMethod[] = []
    
    // Always include primary email if available
    if (userProfile.user.email) {
      methods.push({
        id: '1',
        type: 'email',
        value: userProfile.user.email,
        verified: true, // Primary email is always verified
        primary: true,
        lastUsed: '2 min ago'
      })
    }
    
    // Include linked emails with their verification status
    if (userProfile.user.linkedEmails) {
      userProfile.user.linkedEmails.forEach((email, index) => {
        // Skip if it's the primary email (already included above)
        if (email === userProfile.user.email) return
        
        const isVerified = userProfile.user.verifiedEmails?.includes(email) || false
        
        methods.push({
          id: `linked-email-${index}`,
          type: 'email',
          value: email,
          verified: isVerified,
          primary: false,
          lastUsed: isVerified ? 'Recently' : 'Pending verification'
        })
      })
    }
    
    // Include phone if available
    if (userProfile.user.phoneNumber) {
      methods.push({
        id: '2',
        type: 'phone',
        value: userProfile.user.phoneNumber,
        verified: userProfile.user.phoneVerified || false,
        primary: true,
        lastUsed: '1 hour ago'
      })
    }
    
    return methods
  }

  const authMethods = getAuthMethods()

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    // Check for URL parameters and show appropriate messages
    const urlParams = new URLSearchParams(window.location.search)
    
    if (urlParams.get('social_linked') === 'true') {
      setSuccess('Social account linked successfully!')
    } else if (urlParams.get('email_verified') === 'true') {
      const email = urlParams.get('email')
      setSuccess(email ? `Email ${email} verified successfully!` : 'Email verified successfully!')
    } else if (urlParams.get('phone_verified') === 'true') {
      const phone = urlParams.get('phone')
      setSuccess(phone ? `Phone ${phone} verified successfully!` : 'Phone verified successfully!')
    } else if (urlParams.get('error')) {
      const errorType = urlParams.get('error')
      switch (errorType) {
        case 'missing-token':
          setError('Verification link is missing required information.')
          break
        case 'invalid-token':
          setError('Verification link is invalid or has expired.')
          break
        case 'user-not-found':
          setError('User account not found.')
          break
        case 'email-not-found':
          setError('Email address not found in your linked emails.')
          break
        case 'verification-failed':
          setError('Email verification failed. Please try again.')
          break
        case 'server-error':
          setError('A server error occurred. Please try again later.')
          break
        default:
          setError('An error occurred during verification.')
      }
    }
    
    // Clean up URL parameters after processing
    if (urlParams.toString()) {
      window.history.replaceState({}, '', '/account/security')
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFindAccounts = async () => {
    if (!userProfile?.user) return
    
    await findAccountsToLink(
      userProfile.user.email,
      userProfile.user.phoneNumber,
      userProfile.user.name
    )
  }

  const handleLinkAccounts = async (primaryUserId: string, secondaryUserIds: string[]) => {
    const success = await linkAccounts(primaryUserId, secondaryUserIds)
    if (success) {
      await fetchUserProfile() // Refresh profile after linking
    }
    return success
  }

  const handleAddMethod = (type: 'email' | 'phone' | 'oauth') => {
    setError('')
    setSuccess('')
    
    switch (type) {
      case 'email':
        setShowAddEmailModal(true)
        break
      case 'phone':
        setShowAddPhoneModal(true)
        break
      case 'oauth':
        setShowAddSocialModal(true)
        break
    }
  }

  const handleRemoveMethod = async (methodId: string) => {
    // Implementation would call API to remove method
    console.log(`Remove method ${methodId}`)
  }

  const handleResendVerification = async (email: string, type: 'email' | 'phone') => {
    if (type === 'email') {
      try {
        const response = await fetch('/api/user/add-email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })

        const data = await response.json()

        if (response.ok) {
          setSuccess(`Verification email resent to ${email}`)
        } else {
          setError(data.error || 'Failed to resend verification email')
        }
      } catch (error) {
        setError('Failed to resend verification email. Please try again.')
      }
    }
  }

  const handleRemoveUnverified = async (email: string, type: 'email' | 'phone') => {
    if (type === 'email') {
      if (!confirm(`Remove the unverified email ${email}?`)) return

      try {
        const response = await fetch('/api/user/add-email', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })

        const data = await response.json()

        if (response.ok) {
          setSuccess(`Unverified email ${email} removed successfully`)
          fetchUserProfile() // Refresh the profile
        } else {
          setError(data.error || 'Failed to remove email')
        }
      } catch (error) {
        setError('Failed to remove email. Please try again.')
      }
    }
  }

  const getMethodStatusColor = (method: AuthMethod) => {
    if (method.primary) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (method.verified) return 'bg-green-100 text-green-800 border-green-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getMethodStatusText = (method: AuthMethod) => {
    if (method.primary) return 'Primary'
    if (method.verified) return 'Verified'
    return 'Unverified'
  }

  const handleModalSuccess = (message: string) => {
    setSuccess(message)
    fetchUserProfile() // Refresh the profile data
  }

  const handleModalError = (errorMessage: string) => {
    setError(errorMessage)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Security</h1>
          <p className="mt-2 text-gray-600">
            Manage your authentication methods and security settings
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-green-400">✅</span>
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-400">⚠️</span>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Authentication Methods */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Authentication Methods
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Ways you can sign in to your account
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {authMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {method.type === 'email' ? '📧' : method.type === 'phone' ? '📱' : '🌐'}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">{method.value}</div>
                          <div className="text-sm text-gray-500">
                            Last used {method.lastUsed}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMethodStatusColor(method)}`}>
                          {getMethodStatusText(method)}
                        </span>
                        {!method.verified && method.type === 'email' && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleResendVerification(method.value, method.type)}
                              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                              title="Resend verification email"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRemoveUnverified(method.value, method.type)}
                              className="text-red-600 hover:text-red-700 text-xs font-medium"
                              title="Remove unverified email"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {!method.primary && method.verified && (
                          <button
                            onClick={() => handleRemoveMethod(method.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Quick Actions
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAddMethod('email')}
                    className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className="text-2xl">📧</span>
                    <div>
                      <div className="font-medium text-gray-900">Add Email</div>
                      <div className="text-sm text-gray-600">Link another email address</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddMethod('phone')}
                    className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className="text-2xl">📱</span>
                    <div>
                      <div className="font-medium text-gray-900">Add Phone</div>
                      <div className="text-sm text-gray-600">Link a phone number</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleAddMethod('oauth')}
                    className="flex items-center space-x-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className="text-2xl">🌐</span>
                    <div>
                      <div className="font-medium text-gray-900">Add Social</div>
                      <div className="text-sm text-gray-600">Connect Google, GitHub, etc.</div>
                    </div>
                  </button>

                  <button
                    onClick={handleFindAccounts}
                    disabled={isLinkingLoading}
                    className="flex items-center space-x-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
                  >
                    <span className="text-2xl">🔗</span>
                    <div>
                      <div className="font-medium text-gray-900">Find Accounts</div>
                      <div className="text-sm text-gray-600">
                        {isLinkingLoading ? 'Searching...' : 'Link existing accounts'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-900">Signed in via email</span>
                  </div>
                  <span className="text-gray-500">2 min ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-gray-900">Profile updated</span>
                  </div>
                  <span className="text-gray-500">1 hour ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="text-gray-900">Phone verified</span>
                  </div>
                  <span className="text-gray-500">Yesterday</span>
                </div>
              </div>
              
              <button className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all activity →
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <span className="text-green-600">✓</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Phone Verified</span>
                  <span className={userProfile?.user?.phoneNumber ? "text-green-600" : "text-gray-400"}>
                    {userProfile?.user?.phoneNumber ? "✓" : "—"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Social Accounts</span>
                  <span className="text-gray-400">—</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Two-Factor Auth</span>
                  <span className="text-gray-400">—</span>
                </div>
              </div>
            </div>

            {/* Linked Accounts Summary */}
            {userProfile?.user?.hasLinkedAccounts && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Linked Accounts</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {userProfile?.user?.linkedAccountsCount || 0}
                      </div>
                      <div className="text-xs text-gray-600">Active</div>
                    </div>
                  </div>
                  
                  <button className="w-full bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                    View All Linked Accounts
                  </button>
                </div>
              </div>
            )}

            {/* Security Tips Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>💡</span>
                <span>Security Tips</span>
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <div className="font-medium text-gray-900">Link Multiple Methods</div>
                    <div className="text-gray-600">Access your account even if one method fails</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <div>
                    <div className="font-medium text-gray-900">Verify Everything</div>
                    <div className="text-gray-600">Ensure all methods are properly verified</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-0.5">ℹ</span>
                  <div>
                    <div className="font-medium text-gray-900">Account Linking</div>
                    <div className="text-gray-600">We automatically detect and suggest account merges</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-500 mt-0.5">⚠</span>
                  <div>
                    <div className="font-medium text-gray-900">Stay Secure</div>
                    <div className="text-gray-600">Never share your verification codes or passwords</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Linking Modal */}
        <AccountLinkingModal
          isOpen={showLinkingModal}
          onClose={() => setShowLinkingModal(false)}
          candidates={candidates}
          currentUserData={{
            email: userProfile?.user?.email,
            phoneNumber: userProfile?.user?.phoneNumber,
            name: userProfile?.user?.name || '',
            userId: userProfile?.user?.id
          }}
          onConfirmLinking={handleLinkAccounts}
          isLoading={isLinkingLoading}
        />

        {/* Add Email Modal */}
        <AddEmailModal
          isOpen={showAddEmailModal}
          onClose={() => setShowAddEmailModal(false)}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
          userProfile={userProfile}
        />

        {/* Add Phone Modal */}
        <AddPhoneModal
          isOpen={showAddPhoneModal}
          onClose={() => setShowAddPhoneModal(false)}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
        />

        {/* Add Social Modal */}
        <AddSocialModal
          isOpen={showAddSocialModal}
          onClose={() => setShowAddSocialModal(false)}
          onSuccess={handleModalSuccess}
          onError={handleModalError}
        />
      </div>
    </ProtectedRoute>
  )
}