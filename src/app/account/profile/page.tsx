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
    timezone: 'UTC'
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/complete-profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        setEditData({
          name: data.profile.user.name || '',
          bio: '', // Would come from backend
          location: '', // Would come from backend
          website: '', // Would come from backend
          timezone: 'UTC' // Would come from backend
        })
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
      const response = await fetch('/api/user/complete-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          bio: editData.bio,
          location: editData.location,
          website: editData.website,
          timezone: editData.timezone
        })
      })

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        setIsEditing(false)
        await fetchUserProfile()
        await update() // Update NextAuth session
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('An error occurred while updating your profile')
    } finally {
      setIsSaving(false)
    }
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
              <span>Profile</span>
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your personal information and account details
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              href="/account/security"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              🔐 Security Settings
            </Link>
            <Link
              href="/account/settings"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ⚙️ Account Settings
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
                      src={userProfile?.user.image || ''}
                      alt={userProfile?.user.name || ''}
                      className="w-20 h-20 rounded-full border-4 border-gray-200"
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
                      <span>🕒 Member for {getAccountAgeText(userProfile?.stats.accountAge || 0)}</span>
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
                        <p className="text-gray-900 py-2">{userProfile?.user.name}</p>
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
                          placeholder="City, Country"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{editData.location || 'Not specified'}</p>
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
                        <p className="text-gray-900 py-2">
                          {editData.website ? (
                            <a href={editData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                              {editData.website}
                            </a>
                          ) : (
                            'Not specified'
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      {isEditing ? (
                        <select
                          value={editData.timezone}
                          onChange={(e) => setEditData(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Europe/Paris">Central European Time</option>
                          <option value="Asia/Tokyo">Japan Standard Time</option>
                          <option value="Asia/Shanghai">China Standard Time</option>
                          <option value="Australia/Sydney">Australian Eastern Time</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 py-2">{editData.timezone}</p>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tell us about yourself..."
                      />
                    ) : (
                      <p className="text-gray-900 py-2">{editData.bio || 'No bio provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Stats
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Authentication Methods</span>
                  <span className="font-semibold text-gray-900">
                    {userProfile?.stats.totalAuthMethods || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Linked Emails</span>
                  <span className="font-semibold text-gray-900">
                    {userProfile?.user.linkedEmails.length || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Linked Phones</span>
                  <span className="font-semibold text-gray-900">
                    {userProfile?.user.linkedPhones.length || 0}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Age</span>
                  <span className="font-semibold text-gray-900">
                    {getAccountAgeText(userProfile?.stats.accountAge || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Available Auth Methods */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Sign-In Methods
              </h3>
              
              <div className="space-y-3">
                {userProfile?.authMethods.map((method, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">{getAuthMethodIcon(method)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">{method}</div>
                      <div className="text-xs text-gray-500">
                        {method === 'credentials' && 'Email & Password'}
                        {method === 'phone' && 'SMS Verification'}
                        {method === 'google' && 'Google Account'}
                        {method === 'github' && 'GitHub Account'}
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                ))}
              </div>
              
              <Link
                href="/account/security"
                className="mt-4 block w-full text-center bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                Manage Methods →
              </Link>
            </div>

            {/* Account Group Info */}
            {userProfile?.groupInfo && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>🔗</span>
                  <span>Linked Accounts</span>
                </h3>
                
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
                  
                  <div className="text-xs text-gray-600">
                    {userProfile.groupInfo.isMaster ? (
                      '👑 You are the primary account holder'
                    ) : (
                      '🔗 This account is linked to others'
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <Link
                  href="/account/security"
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>🔐</span>
                  <span className="text-sm font-medium text-gray-900">Security Settings</span>
                </Link>
                
                <Link
                  href="/account/settings"
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span>⚙️</span>
                  <span className="text-sm font-medium text-gray-900">Account Settings</span>
                </Link>
                
                <button className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full text-left">
                  <span>📧</span>
                  <span className="text-sm font-medium text-gray-900">Export Data</span>
                </button>
                
                <button className="flex items-center space-x-3 p-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors w-full text-left">
                  <span>🗑️</span>
                  <span className="text-sm font-medium text-red-700">Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}