// src/app/account/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

interface UserProfile {
  user: {
    id: string
    name: string
    email?: string
    phoneNumber?: string
    image?: string
    bio?: string
    location?: string
    website?: string
    timezone?: string
    registerSource: string
    avatarType: string
    linkedEmails: string[]
    linkedPhones: string[]
    linkedProviders: string[]
    emailVerified: boolean
    phoneVerified: boolean
    createdAt: string
    lastSignIn?: string
    groupId?: string
  }
  authMethods: string[]
  groupInfo?: {
    groupId: string
    isMaster: boolean
    totalAccounts: number
    activeAccounts: number
  }
  stats: {
    accountAge: number
    totalAuthMethods: number
    hasLinkedAccounts: boolean
  }
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [editData, setEditData] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    timezone: 'UTC',
    phoneNumber: ''
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        setEditData({
          name: data.profile.user.name || '',
          bio: data.profile.user.bio || '',
          location: data.profile.user.location || '',
          website: data.profile.user.website || '',
          timezone: data.profile.user.timezone || 'UTC',
          phoneNumber: data.profile.user.phoneNumber || ''
        })
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        setUserProfile(data.profile)
        setIsEditing(false)
        
        // Update session if name changed
        if (editData.name !== userProfile?.user.name) {
          await update({
            ...session,
            user: {
              ...session?.user,
              name: editData.name
            }
          })
        }
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      })

      if (response.ok) {
        await fetchUserProfile() // Refresh profile
      }
    } catch (error) {
      console.error('Error updating field:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAccountAgeText = (days: number) => {
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    return `${Math.floor(days / 365)} years`
  }

  const timezones = [
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
    'Australia/Sydney', 'Pacific/Auckland'
  ]

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
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
              <span>My Profile</span>
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your personal information and account details
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              href="/account/settings"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ⚙️ Account Settings
            </Link>
            <Link
              href="/account/security"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              🔐 Security
            </Link>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-green-400">✅</span>
              <p className="ml-3 text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-400">⚠️</span>
              <p className="ml-3 text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Personal Information
                  </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setError('')
                          setSuccess('')
                          // Reset edit data
                          setEditData({
                            name: userProfile?.user.name || '',
                            bio: userProfile?.user.bio || '',
                            location: userProfile?.user.location || '',
                            website: userProfile?.user.website || '',
                            timezone: userProfile?.user.timezone || 'UTC',
                            phoneNumber: userProfile?.user.phoneNumber || ''
                          })
                        }}
                        className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium transition-colors"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Profile Header */}
                <div className="flex items-start space-x-6 mb-8">
                  <div className="relative">
                    <img
                      src={userProfile?.user.image || '/default-avatar.png'}
                      alt={userProfile?.user.name || 'User'}
                      className="w-20 h-20 rounded-full border-4 border-gray-200 object-cover"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">📷</span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {userProfile?.user.name}
                      </h3>
                      {userProfile?.groupInfo?.isMaster && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Primary Account
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">
                      {userProfile?.user.email || 'No email set'}
                    </p>
                    {userProfile?.user.phoneNumber && (
                      <p className="text-gray-600">
                        {userProfile.user.phoneNumber}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>📅 Joined {formatDate(userProfile?.user.createdAt || '')}</span>
                      <span>🕒 Member for {getAccountAgeText(userProfile?.stats?.accountAge || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{userProfile?.user.name || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editData.phoneNumber}
                          onChange={(e) => setEditData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{userProfile?.user.phoneNumber || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editData.location}
                          onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your location"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{userProfile?.user.location || 'Not set'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      {isEditing ? (
                        <input
                          type="url"
                          value={editData.website}
                          onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://example.com"
                        />
                      ) : (
                        <div className="py-2">
                          {userProfile?.user.website ? (
                            <a 
                              href={userProfile.user.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {userProfile.user.website}
                            </a>
                          ) : (
                            <span className="text-gray-900">Not set</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      {isEditing ? (
                        <select
                          value={editData.timezone}
                          onChange={(e) => setEditData(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {timezones.map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-gray-900 py-2">{userProfile?.user.timezone || 'UTC'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <div className="py-2">
                        {userProfile?.user.bio ? (
                          <p className="text-gray-900 whitespace-pre-wrap">{userProfile.user.bio}</p>
                        ) : (
                          <p className="text-gray-500 italic">No bio added yet</p>
                        )}
                      </div>
                    )}
                    {isEditing && (
                      <div className="text-xs text-gray-500 mt-1">
                        {editData.bio.length}/500 characters
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Account Overview</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Registration Method</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {userProfile?.user.registerSource}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email Verified</span>
                  <span className={`text-sm font-medium ${userProfile?.user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {userProfile?.user.emailVerified ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Phone Verified</span>
                  <span className={`text-sm font-medium ${userProfile?.user.phoneVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {userProfile?.user.phoneVerified ? '✅ Yes' : '❌ No'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auth Methods</span>
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile?.stats?.totalAuthMethods || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Sign In</span>
                  <span className="text-sm font-medium text-gray-900">
                    {userProfile?.user.lastSignIn ? 
                      new Date(userProfile.user.lastSignIn).toLocaleDateString() : 
                      'Current session'
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Linked Accounts */}
            {userProfile?.stats?.hasLinkedAccounts && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Linked Accounts</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Group ID</span>
                      <span className="text-sm font-mono text-gray-900">
                        {userProfile?.groupInfo?.groupId?.slice(-8) || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Role</span>
                      <span className="text-sm font-medium text-gray-900">
                        {userProfile?.groupInfo?.isMaster ? 'Primary' : 'Linked'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Accounts</span>
                      <span className="text-sm font-medium text-gray-900">
                        {userProfile?.groupInfo?.totalAccounts}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Accounts</span>
                      <span className="text-sm font-medium text-gray-900">
                        {userProfile?.groupInfo?.activeAccounts}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/account/security"
                    className="mt-4 w-full bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium text-center block"
                  >
                    Manage Linked Accounts
                  </Link>
                </div>
              </div>
            )}

            {/* Authentication Methods */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Authentication</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {userProfile?.authMethods?.map((method, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-900 capitalize">{method}</span>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500">No authentication methods found</div>
                  )}
                  
                  {userProfile?.user.linkedEmails && userProfile.user.linkedEmails.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">Linked Emails:</p>
                      {userProfile.user.linkedEmails.map((email, index) => (
                        <div key={index} className="text-xs text-gray-600 ml-2">
                          • {email}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/account/security"
                  className="mt-4 w-full bg-gray-50 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium text-center block"
                >
                  Security Settings
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <Link
                  href="/account/settings"
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span>⚙️</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">Account Settings</div>
                    <div className="text-xs text-gray-500">Privacy, notifications, preferences</div>
                  </div>
                </Link>

                <Link
                  href="/account/security"
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span>🔐</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-900">Security</div>
                    <div className="text-xs text-gray-500">Password, 2FA, linked accounts</div>
                  </div>
                </Link>

                <button
                  onClick={() => handleFieldUpdate('lastActivity', new Date().toISOString())}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  <span>🔄</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">Refresh Profile</div>
                    <div className="text-xs text-gray-500">Sync latest account data</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}