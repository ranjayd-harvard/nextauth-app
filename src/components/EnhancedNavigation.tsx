// src/components/EnhancedNavigation.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import ProfileAvatar from '@/components/ProfileAvatar'

export default function EnhancedNavigation() {
  const { data: session, status } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
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

  const getAuthMethodsCount = () => {
    if (!session?.user) return 0
    let count = 0
    if (session.user.email) count++
    if (session.user.phoneNumber) count++
    if (session.user.linkedProviders?.length) count += session.user.linkedProviders.length
    return count
  }

  const getAccountStatus = () => {
    const methodsCount = getAuthMethodsCount()
    if (methodsCount > 1) return { text: `${methodsCount} linked methods`, color: 'text-green-600' }
    if (methodsCount === 1) return { text: 'Single method', color: 'text-yellow-600' }
    return { text: 'No methods', color: 'text-red-600' }
  }

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

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {status === 'loading' ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="hidden sm:block w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : session ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <ProfileAvatar
                      src={session.user?.image}
                      name={session.user?.name}
                      email={session.user?.email}
                      size="sm"
                      avatarType={session.user?.avatarType}
                      showBadge={false}
                    />
                    {/* <img
                      src={session.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || 'User')}&background=3B82F6&color=ffffff&size=200&bold=true`}
                      alt={session.user?.name || ''}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 object-cover"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user?.name || 'User')}&background=3B82F6&color=ffffff&size=200&bold=true`
                      }}
                    /> */}
                    {session.user?.hasLinkedAccounts && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">🔗</span>
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {session.user?.name}
                    </div>
                    <div className="text-xs text-gray-500">
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
                            {session.user?.groupId && (
                              <div className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                                <span>🔗</span>
                                <span>{getAuthMethodsCount()} sign-in methods</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link 
                          href="/account/profile" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="w-5 text-center mr-3">👤</span>
                          <div>
                            <div className="font-medium">Profile</div>
                            <div className="text-xs text-gray-500">Manage your information</div>
                          </div>
                        </Link>

                        <Link 
                          href="/account/security" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="w-5 text-center mr-3">🔐</span>
                          <div>
                            <div className="font-medium">Security</div>
                            <div className="text-xs text-gray-500">Add accounts & security</div>
                          </div>
                          {session.user?.hasLinkedAccounts && (
                            <span className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              Linked
                            </span>
                          )}
                        </Link>

                        <Link 
                          href="/account/settings" 
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <span className="w-5 text-center mr-3">⚙️</span>
                          <div>
                            <div className="font-medium">Preferences</div>
                            <div className="text-xs text-gray-500">Settings & privacy</div>
                          </div>
                        </Link>
                      </div>


                      {/* Sign Out */}
                      <div className="border-t border-gray-100 py-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            signOut()
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="w-5 text-center mr-3">🚪</span>
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link
                  href="/auth/sign-in"
                  className="text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/sign-up"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-3">
            <div className="space-y-1">
              <Link 
                href="/" 
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                Home
              </Link>
              <Link 
                href="/about" 
                className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                onClick={() => setShowMobileMenu(false)}
              >
                About
              </Link>
              {session ? (
                <>
                  <Link 
                    href="/dashboard" 
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/account/security" 
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    🔐 Account Security
                  </Link>
                </>
              ) : (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <Link
                    href="/auth/sign-in"
                    className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}