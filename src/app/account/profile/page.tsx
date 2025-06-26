// src/app/account/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import AccountNavDropdown from '@/components/AccountNavDropDown'

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
    setError('')
    try {
      const response = await fetch('/api/user/complete-profile')
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
        const errorData = await response.json().catch(() => ({ error: 'Failed to load profile' }))
        setError(errorData.error || 'Failed to load profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setError('Failed to load profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshProfile = async () => {
    try {
      setError('')
      setSuccess('')
      
      await fetchUserProfile()
      setSuccess('Profile refreshed successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error refreshing profile:', error)
      setError('Failed to refresh profile')
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
        body: JSON.stringify(editData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        setUserProfile(data.profile)
        setIsEditing(false)
        if (editData.name !== session?.user?.name) {
          await update()
        }
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setError('Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setError('')
    setSuccess('')
    if (userProfile) {
      setEditData({
        name: userProfile.user.name || '',
        bio: userProfile.user.bio || '',
        location: userProfile.user.location || '',
        website: userProfile.user.website || '',
        timezone: userProfile.user.timezone || 'UTC',
        phoneNumber: userProfile.user.phoneNumber || ''
      })
    }
  }

  const formatAccountAge = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 1) return 'Today'
    if (diffInDays === 1) return '1 day'
    if (diffInDays < 30) return `${diffInDays} days`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months`
    return `${Math.floor(diffInDays / 365)} years`
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading profile...</span>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error && !userProfile) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Profile</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchUserProfile()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header with Dropdown */}
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
          
          <AccountNavDropdown onRefreshProfile={handleRefreshProfile} currentPage="profile" />
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
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <span>✏️</span>
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancel}
                        className="text-gray-600 hover:text-gray-700 text-sm font-medium px-3 py-1 border border-gray-300 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-3 py-1 rounded"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Profile Avatar & Basic Info */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    {userProfile?.user.image ? (
                      <img
                        src={userProfile.user.image}
                        alt="Profile"
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-2xl text-gray-400">👤</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {userProfile?.user.name || 'No name set'}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        🌟 {userProfile?.user.registerSource || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">
                        📅 Joined {userProfile?.user.createdAt ? formatAccountAge(userProfile.user.createdAt) : 'Unknown'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {userProfile?.user.email || 'No email set'}
                      {userProfile?.user.emailVerified && (
                        <span className="ml-2 text-green-600">✅ Verified</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      🌐 Member for {userProfile?.user.createdAt ? formatAccountAge(userProfile.user.createdAt) : 'Unknown'}
                    </p>
                  </div>
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {userProfile?.user.name || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phoneNumber}
                        onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your phone number"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {userProfile?.user.phoneNumber || 'Not set'}
                        {userProfile?.user.phoneVerified && (
                          <span className="ml-2 text-green-600">✅</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.location}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="City, Country"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
                        {userProfile?.user.location || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editData.website}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    ) : (
                      <p className="text-sm text-gray-900">
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
                          'Not set'
                        )}
                      </p>
                    )}
                  </div>

                  {/* Timezone */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    {isEditing ? (
                      <select
                        value={editData.timezone}
                        onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Asia/Shanghai">Shanghai</option>
                        <option value="Asia/Kolkata">India</option>
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900">
                        {userProfile?.user.timezone || 'UTC'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about yourself..."
                      maxLength={500}
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {userProfile?.user.bio || (
                        <span className="italic text-gray-500">No bio added yet</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Overview Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration Method</span>
                  <span className="font-medium">{userProfile?.user.registerSource || 'Unknown'}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Email Verified</span>
                  <span className={userProfile?.user.emailVerified ? 'text-green-600' : 'text-red-600'}>
                    {userProfile?.user.emailVerified ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone Verified</span>
                  <span className={userProfile?.user.phoneVerified ? 'text-green-600' : 'text-red-600'}>
                    {userProfile?.user.phoneVerified ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Auth Methods</span>
                  <span className="font-medium">{userProfile?.authMethods?.length || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Sign In</span>
                  <span className="font-medium">
                    {userProfile?.user.lastSignIn ? 'Current session' : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}