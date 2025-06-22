// src/app/account-linking/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import AccountLinkingModal from '@/components/AccountLinkingModal'
import AccountGroupManager from '@/components/AccountGroupManager'
import { useAccountLinking } from '@/hooks/useAccountLinking'

interface UserProfile {
  user: {
    id: string
    name: string
    email?: string
    phoneNumber?: string
    image?: string
    registerSource: string
    linkedEmails: string[]
    linkedPhones: string[]
    linkedProviders: string[]
    emailVerified: boolean
    phoneVerified: boolean
    createdAt: string
    lastSignIn?: string
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

export default function AccountLinkingPage() {
  const { data: session } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  
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

  const fetchUserProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch('/api/user/complete-profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
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

  const getAuthMethodIcon = (method: string) => {
    switch (method) {
      case 'credentials': return '🔐'
      case 'phone': return '📱'
      case 'google': return '🔴'
      case 'github': return '⚫'
      default: return '🌐'
    }
  }

  const getStatusColor = (status: boolean) => 
    status ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Account Linking Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Please sign in to view and manage your linked accounts
          </p>
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔗 Account Linking & Merging System
          </h1>
          <p className="text-gray-600">
            Manage and link multiple authentication methods into a unified account
          </p>
        </div>

        {/* Loading State */}
        {isLoadingProfile ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current User Profile */}
            <div className="lg:col-span-2 space-y-6">
              {/* User Info Card */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Your Account Profile
                  </h2>
                </div>
                
                {userProfile && (
                  <div className="p-6">
                    <div className="flex items-start space-x-4 mb-6">
                      <img
                        src={userProfile.user.image || ''}
                        alt={userProfile.user.name}
                        className="w-16 h-16 rounded-full border-2 border-gray-200"
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {userProfile.user.name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          {userProfile.user.email && (
                            <div>📧 {userProfile.user.email}</div>
                          )}
                          {userProfile.user.phoneNumber && (
                            <div>📱 {userProfile.user.phoneNumber}</div>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span>Registered via:</span>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {userProfile.user.registerSource}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {userProfile.authMethods.length}
                        </div>
                        <div className="text-sm text-gray-600">Auth Methods</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {userProfile.user.linkedEmails.length}
                        </div>
                        <div className="text-sm text-gray-600">Linked Emails</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {userProfile.user.linkedPhones.length}
                        </div>
                        <div className="text-sm text-gray-600">Linked Phones</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {userProfile.groupInfo?.totalAccounts || 1}
                        </div>
                        <div className="text-sm text-gray-600">Total Accounts</div>
                      </div>
                    </div>

                    {/* Authentication Methods */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Available Authentication Methods:</h4>
                      <div className="flex flex-wrap gap-2">
                        {userProfile.authMethods.map((method) => (
                          <span
                            key={method}
                            className="inline-flex items-center space-x-2 bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                          >
                            <span>{getAuthMethodIcon(method)}</span>
                            <span className="capitalize">{method}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Verification Status:</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Email Verified</span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(userProfile.user.emailVerified)}`}>
                            {userProfile.user.emailVerified ? '✅ Verified' : '❌ Unverified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm">Phone Verified</span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(userProfile.user.phoneVerified)}`}>
                            {userProfile.user.phoneVerified ? '✅ Verified' : '❌ Unverified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Linked Data */}
                    {(userProfile.user.linkedEmails.length > 1 || userProfile.user.linkedPhones.length > 1) && (
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Linked Identifiers:</h4>
                        
                        {userProfile.user.linkedEmails.length > 1 && (
                          <div className="mb-3">
                            <span className="text-sm text-gray-600 block mb-1">Linked Emails:</span>
                            <div className="flex flex-wrap gap-1">
                              {userProfile.user.linkedEmails.map((email, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                                >
                                  {email}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {userProfile.user.linkedPhones.length > 1 && (
                          <div>
                            <span className="text-sm text-gray-600 block mb-1">Linked Phones:</span>
                            <div className="flex flex-wrap gap-1">
                              {userProfile.user.linkedPhones.map((phone, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
                                >
                                  {phone}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Group Info */}
                    {userProfile.groupInfo && (
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <span>🔗</span>
                          <span>Account Group Information</span>
                          {userProfile.groupInfo.isMaster && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Primary Account
                            </span>
                          )}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Group ID: <code className="bg-white px-1 rounded">{userProfile.groupInfo.groupId}</code></div>
                          <div>Total Accounts: {userProfile.groupInfo.totalAccounts}</div>
                          <div>Active Accounts: {userProfile.groupInfo.activeAccounts}</div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="mt-6 pt-6 border-t">
                      <button
                        onClick={handleFindAccounts}
                        disabled={isLinkingLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                      >
                        {isLinkingLoading && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        )}
                        <span>🔍 Find More Accounts to Link</span>
                      </button>
                      
                      {linkingError && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          {linkingError}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Demo Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Demo Actions
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Test the account linking system with these actions
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => window.open('/auth/signin', '_blank')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-gray-900">🚀 Register New Account</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Open registration in new tab to test auto-linking
                      </div>
                    </button>
                    
                    <button
                      onClick={handleFindAccounts}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-gray-900">🔍 Search for Accounts</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Find potential accounts to link manually
                      </div>
                    </button>
                    
                    <button
                      onClick={() => window.open('/auth/signin-phone', '_blank')}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-gray-900">📱 Register Phone</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Test phone registration with linking
                      </div>
                    </button>
                    
                    <button
                      onClick={fetchUserProfile}
                      className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="font-medium text-gray-900">🔄 Refresh Profile</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Reload your complete profile data
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Group Manager Sidebar */}
            <div className="lg:col-span-1">
              <AccountGroupManager className="sticky top-8" />
            </div>
          </div>
        )}

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
    </div>
  )
}