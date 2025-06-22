// src/app/account/security/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AccountLinkingModal from '@/components/AccountLinkingModal'
import { useAccountLinking } from '@/hooks/useAccountLinking'

interface AuthMethod {
  id: string
  type: 'email' | 'phone' | 'oauth'
  identifier: string
  verified: boolean
  primary: boolean
  addedAt: string
  icon: string
  canRemove: boolean
}

interface UserProfile {
  user: {
    id: string
    name: string
    email?: string
    phoneNumber?: string
    linkedEmails: string[]
    linkedPhones: string[]
    linkedProviders: string[]
    emailVerified: boolean
    phoneVerified: boolean
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

export default function AccountSecurity() {
  const { data: session } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([])
  
  const {
    candidates,
    isLoading: isLinkingLoading,
    error: linkingError,
    showLinkingModal,
    findCandidates,
    linkAccounts,
    setShowLinkingModal,
    resetState
  } = useAccountLinking()

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session])

  useEffect(() => {
    if (userProfile) {
      buildAuthMethods()
    }
  }, [userProfile])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/complete-profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const buildAuthMethods = () => {
    if (!userProfile) return

    const methods: AuthMethod[] = []

    // Email methods
    userProfile.user.linkedEmails.forEach((email, index) => {
      methods.push({
        id: `email-${index}`,
        type: 'email',
        identifier: email,
        verified: userProfile.user.emailVerified && email === userProfile.user.email,
        primary: email === userProfile.user.email,
        addedAt: new Date().toISOString(), // Would come from backend
        icon: '📧',
        canRemove: userProfile.user.linkedEmails.length > 1 || userProfile.user.linkedPhones.length > 0
      })
    })

    // Phone methods
    userProfile.user.linkedPhones.forEach((phone, index) => {
      methods.push({
        id: `phone-${index}`,
        type: 'phone',
        identifier: phone,
        verified: userProfile.user.phoneVerified && phone === userProfile.user.phoneNumber,
        primary: phone === userProfile.user.phoneNumber,
        addedAt: new Date().toISOString(),
        icon: '📱',
        canRemove: userProfile.user.linkedPhones.length > 1 || userProfile.user.linkedEmails.length > 0
      })
    })

    // OAuth methods
    userProfile.user.linkedProviders.forEach((provider, index) => {
      const providerIcons: Record<string, string> = {
        google: '🔴',
        github: '⚫',
        facebook: '🔵',
        twitter: '🐦'
      }

      methods.push({
        id: `oauth-${provider}-${index}`,
        type: 'oauth',
        identifier: provider.charAt(0).toUpperCase() + provider.slice(1),
        verified: true, // OAuth is always verified
        primary: false,
        addedAt: new Date().toISOString(),
        icon: providerIcons[provider] || '🌐',
        canRemove: methods.length > 0 // Can remove if other methods exist
      })
    })

    setAuthMethods(methods)
  }

  const handleFindAccounts = async () => {
    if (!userProfile) return
    
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
    // Implementation would open appropriate modal/form
    console.log(`Add ${type} method`)
  }

  const handleRemoveMethod = async (methodId: string) => {
    // Implementation would call API to remove method
    console.log(`Remove method ${methodId}`)
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <span>🔐</span>
            <span>Account Security</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your sign-in methods and account linking settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connected Methods Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Your Sign-In Methods
                  </h2>
                  <span className="text-sm text-gray-500">
                    {authMethods.length} method{authMethods.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                {authMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-4">🔐</div>
                    <p className="text-gray-600">No authentication methods found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {authMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl">{method.icon}</div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {method.identifier}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {method.type} • Added recently
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getMethodStatusColor(method)}`}>
                            {getMethodStatusText(method)}
                          </span>
                          
                          {method.canRemove && !method.primary && (
                            <button
                              onClick={() => handleRemoveMethod(method.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Remove method"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
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
                    <span className="text-2xl">🔍</span>
                    <div>
                      <div className="font-medium text-gray-900">Find Accounts</div>
                      <div className="text-sm text-gray-600">Search for accounts to link</div>
                    </div>
                  </button>
                </div>

                {linkingError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{linkingError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Settings Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Security Settings
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-600">Add an extra layer of security</div>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Login Notifications</div>
                    <div className="text-sm text-gray-600">Get notified of new sign-ins</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Account Recovery</div>
                    <div className="text-sm text-gray-600">Set up recovery options</div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Group Card */}
            {userProfile?.groupInfo && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-2xl">🔗</span>
                  <h3 className="text-lg font-semibold text-gray-900">Account Group</h3>
                  {userProfile.groupInfo.isMaster && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <span className="text-gray-600">Group ID:</span>
                    <code className="ml-2 bg-white px-2 py-1 rounded text-xs">
                      {userProfile.groupInfo.groupId}
                    </code>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">
                        {userProfile.groupInfo.totalAccounts}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">
                        {userProfile.groupInfo.activeAccounts}
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
        </div>

        {/* Account Linking Modal */}
        <AccountLinkingModal
          isOpen={showLinkingModal}
          onClose={() => setShowLinkingModal(false)}
          candidates={candidates}
          currentUserData={{
            email: userProfile?.user.email,
            phoneNumber: userProfile?.user.phoneNumber,
            name: userProfile?.user.name || '',
            userId: userProfile?.user.id
          }}
          onConfirmLinking={handleLinkAccounts}
          isLoading={isLinkingLoading}
        />
      </div>
    </ProtectedRoute>
  )
}