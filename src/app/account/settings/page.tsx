// src/app/account/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import ProtectedRoute from '@/components/ProtectedRoute'
import Link from 'next/link'

interface UserSettings {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    security: boolean
    marketing: boolean
    weekly_summary: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'friends'
    show_email: boolean
    show_phone: boolean
    analytics_tracking: boolean
    personalized_ads: boolean
  }
  preferences: {
    language: string
    timezone: string
    date_format: string
    theme: 'light' | 'dark' | 'auto'
    email_frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  }
  security: {
    two_factor_enabled: boolean
    login_notifications: boolean
    session_timeout: number
    password_change_required: boolean
  }
}

export default function AccountSettings() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        setError('Failed to load settings')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      setError('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSettingChange = (section: keyof UserSettings, key: string, value: any) => {
    if (!settings) return
    
    setSettings(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [key]: value
      }
    }))
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Settings saved successfully!')
      } else {
        setError(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSpecificSetting = async (section: keyof UserSettings, updates: any) => {
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, updates })
      })

      if (response.ok) {
        await fetchSettings() // Refresh settings
      }
    } catch (error) {
      console.error('Error updating setting:', error)
    }
  }

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion')
      return
    }

    setIsDeletingAccount(true)
    setError('')

    try {
      const response = await fetch('/api/user/complete-profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          confirmDelete: true,
          transferGroupOwnership: true 
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Account deleted successfully, sign out
        await signOut({ callbackUrl: '/' })
      } else {
        setError(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('An error occurred while deleting your account')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const resetAllSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setIsSaving(true)
      try {
        // Delete current settings (API will return defaults)
        await fetch('/api/user/settings', { method: 'DELETE' })
        await fetchSettings()
        setSuccess('Settings reset to default values')
      } catch (error) {
        setError('Failed to reset settings')
      } finally {
        setIsSaving(false)
      }
    }
  }

  if (isLoading || !settings) {
    return (
      <ProtectedRoute>
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
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
              <span>⚙️</span>
              <span>Account Settings</span>
            </h1>
            <p className="mt-2 text-gray-600">
              Manage your preferences, privacy, and account settings
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              href="/account/profile"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              👤 Profile
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

        <div className="space-y-6">
          {/* Notifications Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🔔</span>
                <span>Notifications</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose how you want to be notified about account activity
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(settings.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900 capitalize">
                        {key.replace('_', ' ')} Notifications
                      </label>
                      <p className="text-xs text-gray-600">
                        {getNotificationDescription(key)}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={value}
                        onChange={(e) => handleSettingChange('notifications', key, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🔒</span>
                <span>Privacy</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Control your privacy and data sharing preferences
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Profile Visibility
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'public', label: 'Public', description: 'Anyone can see your profile' },
                      { value: 'private', label: 'Private', description: 'Only you can see your profile' },
                      { value: 'friends', label: 'Friends', description: 'Only friends can see your profile' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                          settings.privacy.profile_visibility === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="profile_visibility"
                          value={option.value}
                          checked={settings.privacy.profile_visibility === option.value}
                          onChange={(e) => handleSettingChange('privacy', 'profile_visibility', e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex w-full justify-between">
                          <div className="flex flex-col">
                            <span className="block text-sm font-medium text-gray-900">
                              {option.label}
                            </span>
                            <span className="block text-sm text-gray-500">
                              {option.description}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(settings.privacy).filter(([key]) => key !== 'profile_visibility').map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900 capitalize">
                          {key.replace('_', ' ')}
                        </label>
                        <p className="text-xs text-gray-600">
                          {getPrivacyDescription(key)}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={value as boolean}
                          onChange={(e) => handleSettingChange('privacy', key, e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🎛️</span>
                <span>Preferences</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Customize your experience and interface settings
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Europe/Berlin">Berlin</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                    <option value="Asia/Shanghai">Shanghai</option>
                    <option value="Australia/Sydney">Sydney</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.preferences.date_format}
                    onChange={(e) => handleSettingChange('preferences', 'date_format', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (UK)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    <option value="DD.MM.YYYY">DD.MM.YYYY (EU)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Theme
                  </label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Frequency
                  </label>
                  <select
                    value={settings.preferences.email_frequency}
                    onChange={(e) => handleSettingChange('preferences', 'email_frequency', e.target.value)}
                    className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Summary</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🔐</span>
                <span>Security</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your account security and authentication settings
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Login Notifications</label>
                    <p className="text-xs text-gray-600">Get notified when someone signs into your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.security.login_notifications}
                      onChange={(e) => handleSettingChange('security', 'login_notifications', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Session Timeout
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Automatically sign out after period of inactivity
                  </p>
                  <select
                    value={settings.security.session_timeout}
                    onChange={(e) => handleSettingChange('security', 'session_timeout', parseInt(e.target.value))}
                    className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={240}>4 hours</option>
                    <option value={720}>12 hours</option>
                    <option value={-1}>Never</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Two-Factor Authentication</label>
                    <p className="text-xs text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <Link
                    href="/account/security"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {settings.security.two_factor_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                  </Link>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Password Change Required</label>
                    <p className="text-xs text-gray-600">Force password change on next login</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.security.password_change_required}
                      onChange={(e) => handleSettingChange('security', 'password_change_required', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-xl shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-200">
              <h2 className="text-xl font-semibold text-red-900 flex items-center space-x-2">
                <span>⚠️</span>
                <span>Danger Zone</span>
              </h2>
              <p className="text-sm text-red-600 mt-1">
                Irreversible and destructive actions
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                    <p className="text-xs text-red-600">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Delete Account
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-900">Reset All Settings</h3>
                    <p className="text-xs text-yellow-600">
                      Reset all preferences to default values
                    </p>
                  </div>
                  <button 
                    onClick={resetAllSettings}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Reset Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset Changes
            </button>
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save All Settings'
              )}
            </button>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  This action cannot be undone. This will permanently delete your account and remove all associated data from our servers.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">What will be deleted:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Your profile and personal information</li>
                    <li>• All linked authentication methods</li>
                    <li>• Account groups and linked accounts</li>
                    <li>• Settings and preferences</li>
                    <li>• Activity history and logs</li>
                  </ul>
                </div>

                {session?.user?.hasLinkedAccounts && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> You have linked accounts. Deleting this account will transfer 
                      primary ownership to another linked account if available.
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Type <strong>DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Type DELETE to confirm"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeleteConfirmText('')
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isDeletingAccount}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccountDeletion}
                  disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeletingAccount ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    'Delete Account Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

// Helper functions for descriptions
function getNotificationDescription(key: string): string {
  const descriptions = {
    email: 'Receive notifications via email',
    sms: 'Receive notifications via SMS',
    push: 'Receive push notifications in browser',
    security: 'Security alerts and login notifications',
    marketing: 'Product updates and promotional content',
    weekly_summary: 'Weekly summary of account activity'
  }
  return descriptions[key] || 'Notification setting'
}

function getPrivacyDescription(key: string): string {
  const descriptions = {
    show_email: 'Display email address on public profile',
    show_phone: 'Display phone number on public profile',
    analytics_tracking: 'Allow usage analytics and tracking',
    personalized_ads: 'Show personalized advertisements'
  }
  return descriptions[key] || 'Privacy setting'
}