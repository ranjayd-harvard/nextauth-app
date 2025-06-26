// src/components/AccountNavDropdown.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  id: string
  label: string
  description: string
  href: string
  icon: string
  action?: () => void
}

interface AccountNavDropdownProps {
  onRefreshProfile?: () => void
  currentPage?: 'profile' | 'security' | 'settings' | 'activity'
}

export default function AccountNavDropdown({ onRefreshProfile, currentPage }: AccountNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  const navigationItems: NavItem[] = [
    {
      id: 'profile',
      label: 'My Profile',
      description: 'Personal information and account details',
      href: '/account/profile',
      icon: '👤'
    },
    {
      id: 'security',
      label: 'Security',
      description: 'Password, 2FA, linked accounts',
      href: '/account/security',
      icon: '🔐'
    },
    {
      id: 'settings',
      label: 'Account Settings',
      description: 'Privacy, notifications, preferences',
      href: '/account/settings',
      icon: '⚙️'
    },
    {
      id: 'activity',
      label: 'Activity Log',
      description: 'View recent account activity',
      href: '/account/activity',
      icon: '📊'
    }
  ]

  const actionItems: NavItem[] = [
    ...(onRefreshProfile ? [{
      id: 'refresh',
      label: 'Refresh Profile',
      description: 'Sync latest account data',
      href: '#',
      icon: '🔄',
      action: () => {
        onRefreshProfile()
        setIsOpen(false)
      }
    }] : []),
    {
      id: 'export',
      label: 'Export Data',
      description: 'Download your account data',
      href: '/account/export',
      icon: '📤'
    },
    {
      id: 'help',
      label: 'Help & Support',
      description: 'Get help with your account',
      href: '/help',
      icon: '❓'
    }
  ]

  const getCurrentPageInfo = () => {
    const current = navigationItems.find(item => pathname?.includes(item.href))
    return current || navigationItems[0]
  }

  const currentPageInfo = getCurrentPageInfo()

  const handleItemClick = (item: NavItem) => {
    if (item.action) {
      item.action()
    } else {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>{currentPageInfo.icon}</span>
        <span>Quick Actions</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-2">
          {/* Navigation Section */}
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Navigation
            </h3>
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const isCurrentPage = pathname?.includes(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                      isCurrentPage
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${
                        isCurrentPage ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {item.label}
                        {isCurrentPage && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${
                        isCurrentPage ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-2"></div>

          {/* Actions Section */}
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Quick Actions
            </h3>
            <div className="space-y-1">
              {actionItems.map((item) => (
                item.action ? (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-transparent"
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </button>
                ) : (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-3 py-2 mt-2">
            <div className="text-xs text-gray-400 text-center">
              Account Management • {new Date().getFullYear()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}