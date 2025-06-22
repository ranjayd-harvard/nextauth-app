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
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      security: true,
      marketing: false,
      weekly_summary: true
    },
    privacy: {
      profile_visibility: 'private',
      show_email: false,
      show_phone: false,
      analytics_tracking: true,
      personalized_ads: false
    },
    preferences: {
      language: 'en',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      theme: 'light',
      email_frequency: 'daily'
    },
    security: {
      two_factor_enabled: false,
      login_notifications: true,
      session_timeout: 30,
      password_change_required: false
    }
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleSettingChange = (section: keyof UserSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const saveSettings = async () => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccess('Settings saved successfully!')
      
      // Here you would make actual API call:
      // const response = await fetch('/api/user/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // })
    } catch (error) {
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/complete-profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          confirmDelete: true,
          transferGroupOwnership: true 
        })
      })

      if (response.ok) {
        await signOut({ callbackUrl: '/' })
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete account')
      }
    } catch (error) {
      setError('An error occurred while deleting your account')
    } finally {
      setIsLoading(false)
    }
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
                Control how and when you receive notifications
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                      <p className="text-xs text-gray-600">Receive notifications via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => handleSettingChange('notifications', 'email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">SMS Notifications</label>
                      <p className="text-xs text-gray-600">Receive important alerts via SMS</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.sms}
                        onChange={(e) => handleSettingChange('notifications', 'sms', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Push Notifications</label>
                      <p className="text-xs text-gray-600">Browser and mobile push notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => handleSettingChange('notifications', 'push', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Security Alerts</label>
                      <p className="text-xs text-gray-600">Login attempts and security events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.security}
                        onChange={(e) => handleSettingChange('notifications', 'security', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Marketing Emails</label>
                      <p className="text-xs text-gray-600">Product updates and promotions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.marketing}
                        onChange={(e) => handleSettingChange('notifications', 'marketing', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-900">Weekly Summary</label>
                      <p className="text-xs text-gray-600">Account activity and insights</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.weekly_summary}
                        onChange={(e) => handleSettingChange('notifications', 'weekly_summary', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div>
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
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
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
                        <div className="flex flex-col">
                          <span className="block text-sm font-medium text-gray-900">
                            {option.label}
                          </span>
                          <span className="block text-xs text-gray-600 mt-1">
                            {option.description}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Show Email Address</label>
                        <p className="text-xs text-gray-600">Make email visible on your profile</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.show_email}
                          onChange={(e) => handleSettingChange('privacy', 'show_email', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Show Phone Number</label>
                        <p className="text-xs text-gray-600">Make phone visible on your profile</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.show_phone}
                          onChange={(e) => handleSettingChange('privacy', 'show_phone', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Analytics Tracking</label>
                        <p className="text-xs text-gray-600">Help improve our service with usage data</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.analytics_tracking}
                          onChange={(e) => handleSettingChange('privacy', 'analytics_tracking', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Personalized Ads</label>
                        <p className="text-xs text-gray-600">Show ads based on your interests</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.privacy.personalized_ads}
                          onChange={(e) => handleSettingChange('privacy', 'personalized_ads', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🎨</span>
                <span>Preferences</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Customize your experience and interface
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
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
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
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Central European Time</option>
                    <option value="Asia/Tokyo">Japan Standard Time</option>
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
                    <option value="DD MMM YYYY">DD MMM YYYY (Verbose)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'auto', label: 'Auto', icon: '🔄' }
                    ].map((theme) => (
                      <label
                        key={theme.value}
                        className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none ${
                          settings.preferences.theme === theme.value
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={theme.value}
                          checked={settings.preferences.theme === theme.value}
                          onChange={(e) => handleSettingChange('preferences', 'theme', e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex flex-col items-center text-center">
                          <span className="text-lg mb-1">{theme.icon}</span>
                          <span className="text-xs font-medium text-gray-900">
                            {theme.label}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Security */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>🛡️</span>
                <span>Advanced Security</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Additional security settings and session management
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900">Login Notifications</label>
                    <p className="text-xs text-gray-600">Get notified of new sign-ins to your account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.security.login_notifications}
                      onChange={(e) => handleSettingChange('security', 'login_notifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
              </div>
            </div>
          </div>

          {/* Data & Export */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <span>📊</span>
                <span>Data & Export</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your data and account information
              </p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="flex items-center justify-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl">📥</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Export Account Data</div>
                    <div className="text-sm text-gray-600">Download all your account information</div>
                  </div>
                </button>

                <button className="flex items-center justify-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Activity Log</div>
                    <div className="text-sm text-gray-600">View your account activity history</div>
                  </div>
                </button>

                <button className="flex items-center justify-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl">🔗</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Connected Apps</div>
                    <div className="text-sm text-gray-600">Manage third-party integrations</div>
                  </div>
                </button>

                <button className="flex items-center justify-center space-x-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <span className="text-2xl">🗄️</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Data Usage</div>
                    <div className="text-sm text-gray-600">See how your data is being used</div>
                  </div>
                </button>
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
                  <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium">
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
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? (
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
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAccountDeletion}
                  disabled={deleteConfirmText !== 'DELETE' || isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
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