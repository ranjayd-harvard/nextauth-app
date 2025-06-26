// src/components/EnhancedNavigation.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import ProfileAvatar from '@/components/ProfileAvatar'

interface UserProfile {
  user: {
    id: string
    name: string
    email?: string
    phoneNumber?: string
    image?: string
    linkedProviders: string[]
    groupId?: string
  }
  authMethods: string[]
  stats: {
    totalAuthMethods: number
  }
}

export default function EnhancedNavigation() {
  const { data: session, status } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authMethodsCount, setAuthMethodsCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch live user profile data when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session?.user?.id])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/complete-profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        setAuthMethodsCount(data.profile.stats.totalAuthMethods)
        console.log('Navigation: Auth methods count updated:', data.profile.stats.totalAuthMethods)
      }
    } catch (error) {
      console.error('Failed to fetch user profile for navigation:', error)
      // Fallback to session-based count if API fails
      setAuthMethodsCount(getSessionBasedAuthMethodsCount())
    }
  }

  // Fallback method using session data (original implementation)
  const getSessionBasedAuthMethodsCount = () => {
    if (!session?.user) return 0
    let count = 0
    if (session.user.email) count++
    if (session.user.phoneNumber) count++
    if (session.user.linkedProviders?.length) count += session.user.linkedProviders.length
    return count
  }

  const getAccountStatus = () => {
    const methodsCount = authMethodsCount
    if (methodsCount > 1) return { text: `${methodsCount} linked methods`, color: 'text-green-600' }
    if (methodsCount === 1) return { text: 'Single method', color: 'text-yellow-600' }
    return { text: 'No methods', color: 'text-red-600' }
  }

  // Function to refresh the auth methods count (can be called from other components)
  const refreshAuthMethodsCount = () => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }

  // Listen for custom events to refresh auth methods count
  useEffect(() => {
    const handleRefreshAuthMethods = () => {
      refreshAuthMethodsCount()
    }

    window.addEventListener('refreshAuthMethods', handleRefreshAuthMethods)
    return () => {
      window.removeEventListener('refreshAuthMethods', handleRefreshAuthMethods)
    }
  }, [session])

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Main Nav */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">MyApp</span>
            </Link>
            
            <div className="hidden md:flex space-x-6">
              <Link 
                href="/" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                About
              </Link>
              {session && (
                <Link 
                  href="/dashboard" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-8 w-8"></div>
              </div>
            ) : session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-2"
                >
                  <ProfileAvatar
                    src={session.user?.image}
                    name={session.user?.name}
                    email={session.user?.email}
                    size="sm"
                    avatarType={session.user?.avatarType}
                    showBadge={false}
                  />
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">{session.user?.name}</div>
                    <div className={`text-xs ${getAccountStatus().color}`}>
                      {getAccountStatus().text}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-2">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <ProfileAvatar
                            src={session.user?.image}
                            name={session.user?.name}
                            email={session.user?.email}
                            size="md"
                            avatarType={session.user?.avatarType}
                            showBadge={false}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{session.user?.name}</div>
                            <div className="text-sm text-gray-500 truncate">{session.user?.email}</div>
                            {(userProfile?.user?.groupId || authMethodsCount > 0) && (
                              <div className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                                <span>🔗</span>
                                <span>{authMethodsCount} sign-in method{authMethodsCount !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link 
                          href="/account/profile" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="mr-3">👤</span>
                          Account Profile
                        </Link>
                        <Link 
                          href="/account/security" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="mr-3">🔐</span>
                          Security Settings
                          {authMethodsCount > 1 && (
                            <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {authMethodsCount} methods
                            </span>
                          )}
                        </Link>
                        <Link 
                          href="/account/activity" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="mr-3">📊</span>
                          Activity History
                        </Link>
                        <Link 
                          href="/dashboard" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="mr-3">📋</span>
                          Dashboard
                        </Link>
                        <div className="border-t border-gray-100 my-1"></div>
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            signOut({ callbackUrl: '/' })
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <span className="mr-3">🚪</span>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/sign-in"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobileMenu && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link href="/" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                About
              </Link>
              {session && (
                <>
                  <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Dashboard
                  </Link>
                  <Link href="/account/profile" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Profile
                  </Link>
                  <Link href="/account/security" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Security
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="text-red-600 hover:text-red-700 block px-3 py-2 text-base font-medium w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              )}
              {!session && (
                <>
                  <Link href="/auth/sign-in" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Sign In
                  </Link>
                  <Link href="/auth/sign-up" className="bg-blue-600 text-white block px-3 py-2 text-base font-medium rounded-md">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}