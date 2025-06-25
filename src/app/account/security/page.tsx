'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { signIn, getProviders } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AccountLinkingModal from '@/components/AccountLinkingModal'
import { useAccountLinking } from '@/hooks/useAccountLinking'
import { useUserActivities, getActivityIcon, getSeverityColor, formatTimeAgo } from '@/hooks/useUserActivities'
import { useAccountStatus, getSecurityScoreColor, getSecurityScoreLabel, getSocialAccountIcon } from '@/hooks/useAccountStatus'
import AccountStatusSidebar from '@/components/AccountStatusSidebar'
import TwoFactorManagement from '@/components/TwoFactorManagement'
import Link from 'next/link'

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
    linkedEmails: string[]
    linkedPhones: string[]
    linkedProviders: string[]
    emailVerified: boolean
    phoneVerified: boolean
    verifiedEmails?: string[]
    verifiedPhones?: string[]
    image?: string
    hasLinkedAccounts?: boolean
    linkedAccountsCount?: number
    groupId?: string
  }
  authMethods: string[]
  linkedAccounts: any[]
  groupInfo?: {
    groupId: string
    isMaster: boolean
    totalAccounts: number
    activeAccounts: number
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
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLocalError('')
    
    try {
      // Check if email is already linked (verified or unverified)
      const emailExists = userProfile?.user.linkedEmails?.includes(email.toLowerCase()) || 
                         userProfile?.user.email === email.toLowerCase()
      
      if (emailExists) {
        const isVerified = userProfile?.user.verifiedEmails?.includes(email.toLowerCase()) || 
                          userProfile?.user.email === email.toLowerCase()
        
        if (isVerified) {
          setLocalError('This email is already verified and linked to your account')
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
              setLocalError('')
            } else {
              setLocalError(resendData.error || 'Failed to resend verification email')
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
        setLocalError('')
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          // Email already exists - show helpful error message
          if (data.suggestLinking) {
            setLocalError(`${data.error} Would you like to link accounts instead? Please use the "Find Accounts" feature.`)
          } else {
            setLocalError(data.error || 'This email address is already registered with another account.')
          }
        } else {
          setLocalError(data.error || 'Failed to add email')
        }
      }
    } catch (error) {
      console.error('Add email error:', error)
      setLocalError('Failed to add email. Please try again.')
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
        
        {/* Error Display */}
        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <span className="text-red-400">⚠️</span>
              <div className="ml-2">
                <p className="text-sm text-red-800">{localError}</p>
              </div>
            </div>
          </div>
        )}
        
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
  const [localError, setLocalError] = useState('')

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLocalError('')
    
    try {
      const response = await fetch('/api/user/add-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, countryCode })
      })

      const data = await response.json()

      if (response.ok) {
        setStep('verify')
        setLocalError('') // Clear any previous errors
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          // Phone number already exists - show helpful error message
          if (data.suggestLinking) {
            setLocalError(`${data.error} Would you like to link accounts instead? Please use the "Find Accounts" feature.`)
          } else {
            setLocalError(data.error || 'This phone number is already registered with another account.')
          }
        } else {
          setLocalError(data.error || 'Failed to add phone number')
        }
      }
    } catch (error) {
      console.error('Add phone error:', error)
      setLocalError('Failed to add phone number. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLocalError('')
    
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
        setLocalError('')
      } else {
        setLocalError(data.error || 'Failed to verify phone number')
      }
    } catch (error) {
      setLocalError('Failed to verify phone number. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const resetModal = () => {
    setPhoneNumber('')
    setVerificationCode('')
    setStep('phone')
    setLocalError('')
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
        
        {/* Error Display */}
        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <span className="text-red-400">⚠️</span>
              <div className="ml-2">
                <p className="text-sm text-red-800">{localError}</p>
              </div>
            </div>
          </div>
        )}
        
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
  const { update } = useSession()
  const [providers, setProviders] = useState<any>({})
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

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
    setIsConnecting(true)
    setLocalError('')

    try {
      console.log(`🔗 Attempting to connect ${providerId} account...`)
      
      const result = await signIn(providerId, { 
        redirect: false,
        callbackUrl: '/account/security?social_linked=true'
      })

      console.log(`🔗 SignIn result for ${providerId}:`, result)

      // Handle specific error cases
      if (result?.error) {
        console.error(`❌ Error connecting ${providerId}:`, result.error)
        
        if (result.error.includes('OAuthAccountNotLinked')) {
          setLocalError('This social account is already linked to another user account. Would you like to link accounts instead? Please use the "Find Accounts" feature.')
        } else if (result.error.includes('OAuthCallbackError')) {
          setLocalError('Failed to connect to the social provider. Please try again.')
        } else if (result.error.includes('AccessDenied')) {
          setLocalError('Access was denied. Please grant permission to link your account.')
        } else if (result.error.includes('Signin')) {
          setLocalError('Failed to sign in with the social provider. Please try again.')
        } else {
          setLocalError(`Failed to connect social account: ${result.error}`)
        }
        return
      }

      // For social account linking, we need to check if the user is still authenticated
      // and if the linking was successful by checking the session
      console.log(`✅ ${providerId} authentication completed, verifying link...`)
      
      // Wait a moment for the session to update
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh the session to get updated user data
      await update()
      
      // At this point, if we reach here without errors, consider it successful
      console.log(`✅ ${providerId} account linked successfully`)
      onSuccess(`${providerId.charAt(0).toUpperCase() + providerId.slice(1)} account connected successfully!`)
      onClose()
      setLocalError('')
      
      // Optional: Force a page refresh to ensure all data is updated
      // window.location.reload()

    } catch (error) {
      console.error(`❌ Social connect error for ${providerId}:`, error)
      setLocalError('Failed to connect social account. Please try again.')
    } finally {
      setIsLoading(false)
      setIsConnecting(false)
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
        
        {/* Error Display */}
        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <span className="text-red-400">⚠️</span>
              <div className="ml-2">
                <p className="text-sm text-red-800">{localError}</p>
              </div>
            </div>
          </div>
        )}
        
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

  // Account status hook
  const { status: accountStatus, refreshStatus } = useAccountStatus()  

  const {
    candidates,
    isLoading: isLinkingLoading,
    error: linkingError,
    showLinkingModal,
    linkAccounts,
    setShowLinkingModal,
    findCandidates
  } = useAccountLinking()

  const {
    activities,
    summary,
    isLoading: isActivitiesLoading,
    refreshActivities
  } = useUserActivities()

  // Generate auth methods based on current user profile
  const getAuthMethods = (): AuthMethod[] => {
    if (!userProfile?.user) return []
    
    const methods: AuthMethod[] = []
    
    // Always include primary email if available
    if (userProfile.user.email) {
      methods.push({
        id: 'primary-email',
        type: 'email',
        value: userProfile.user.email,
        verified: userProfile.user.emailVerified || false,
        primary: true,
        lastUsed: '2 min ago'
      })
    }
    
    // Include linked emails with their verification status
    if (userProfile.user.linkedEmails && userProfile.user.linkedEmails.length > 0) {
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
    
    // Include primary phone if available
    if (userProfile.user.phoneNumber) {
      methods.push({
        id: 'primary-phone',
        type: 'phone',
        value: userProfile.user.phoneNumber,
        verified: userProfile.user.phoneVerified || false,
        primary: true,
        lastUsed: '1 hour ago'
      })
    }
    
    // Include linked phones with their verification status  
    if (userProfile.user.linkedPhones && userProfile.user.linkedPhones.length > 0) {
      userProfile.user.linkedPhones.forEach((phone, index) => {
        // Skip if it's the primary phone (already included above)
        if (phone === userProfile.user.phoneNumber) return
        
        const isVerified = userProfile.user.verifiedPhones?.includes(phone) || false
        
        methods.push({
          id: `linked-phone-${index}`,
          type: 'phone',
          value: phone,
          verified: isVerified,
          primary: false,
          lastUsed: isVerified ? 'Recently' : 'Pending verification'
        })
      })
    }
    
    // Include OAuth providers
    if (userProfile.user.linkedProviders && userProfile.user.linkedProviders.length > 0) {
      userProfile.user.linkedProviders.forEach((provider, index) => {
        methods.push({
          id: `oauth-${provider}-${index}`,
          type: 'oauth',
          value: provider.charAt(0).toUpperCase() + provider.slice(1),
          verified: true, // OAuth is always considered verified
          primary: false,
          lastUsed: 'Recently'
        })
      })
    }
    
    console.log('Generated auth methods:', methods) // Debug log
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

  useEffect(() => {
    if (userProfile) {
      console.log('User profile changed, updating auth methods:', userProfile)
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/complete-profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        console.log('User profile loaded:', data.profile) // Debug log
        refreshStatus()
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFindAccounts = async () => {
    if (!userProfile?.user) return
    
    await findCandidates(
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
    // Parse the method ID to determine what type of method to remove
    const authMethod = authMethods.find(method => method.id === methodId)
    
    if (!authMethod) {
      setError('Authentication method not found')
      return
    }

    // Prevent removing the last authentication method
    const verifiedMethods = authMethods.filter(method => method.verified)
    if (verifiedMethods.length <= 1) {
      setError('Cannot remove the last verified authentication method. Please add another method first.')
      return
    }

    // Prevent removing primary email or phone
    if (authMethod.primary && (authMethod.type === 'email' || authMethod.type === 'phone')) {
      setError('Cannot remove primary authentication method. Please set another method as primary first.')
      return
    }

    // Confirm removal
    const confirmMessage = `Are you sure you want to remove ${authMethod.type === 'oauth' ? authMethod.value + ' account' : authMethod.value}?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      let response
      
      switch (authMethod.type) {
        case 'email':
          response = await fetch('/api/user/remove-email', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: authMethod.value,
              isPrimary: authMethod.primary 
            })
          })
          break

        case 'phone':
          response = await fetch('/api/user/remove-phone', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              phoneNumber: authMethod.value,
              isPrimary: authMethod.primary 
            })
          })
          break

        case 'oauth':
          response = await fetch('/api/user/remove-oauth', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              provider: authMethod.value.toLowerCase()
            })
          })
          break

        default:
          setError('Unsupported authentication method type')
          return
      }

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message || `${authMethod.type === 'oauth' ? authMethod.value + ' account' : authMethod.value} removed successfully`)
        await fetchUserProfile() // Refresh the profile
      } else {
        setError(data.error || 'Failed to remove authentication method')
      }
    } catch (error) {
      setError('Failed to remove authentication method. Please try again.')
    }
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
    refreshActivities() // Refresh activities to show the new event
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
         <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <span>👤</span>
              <span>Account Security</span>
            </h1>
            <p className="mt-2 text-gray-600">
            Manage your authentication methods and security settings
            </p>
          </div>
          
          <div className="flex items-center space-x-3">

            <Link
              href="/account/profile"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              🔐 Profile
            </Link>
            <Link
              href="/account/settings"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ⚙️ Preferences
            </Link>            
          </div>
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

            {/* ====== ADD 2FA COMPONENT HERE ====== */}
            <TwoFactorManagement />            

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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button
                  onClick={refreshActivities}
                  disabled={isActivitiesLoading}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {isActivitiesLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {isActivitiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-3 py-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-600">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getActivityIcon(activity.type)}</span>
                          <div className={`w-2 h-2 rounded-full ${getSeverityColor(activity.severity).includes('text-red') ? 'bg-red-500' : 
                            getSeverityColor(activity.severity).includes('text-orange') ? 'bg-orange-500' :
                            getSeverityColor(activity.severity).includes('text-blue') ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{activity.action}</div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <span>{activity.device}</span>
                            {activity.ip && (
                              <>
                                <span>•</span>
                                <span>{activity.ip}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-500">{formatTimeAgo(activity.timestamp)}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(activity.severity)}`}>
                          {activity.severity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => router.push('/account/activity')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View all activity →
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Enhanced Account Status */}
            <AccountStatusSidebar onRefresh={fetchUserProfile} />


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