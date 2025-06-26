// src/components/ProfileAvatar.tsx
'use client'

import { useMemo } from 'react'

interface ProfileAvatarProps {
  src?: string | null
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  avatarType?: 'default' | 'oauth' | 'uploaded'
  showBadge?: boolean
  className?: string
}

// Function to generate default avatar URL
function generateDefaultAvatar(name: string, email: string): string {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
  
  const colors = [
    '3B82F6', '10B981', 'F59E0B', 'EF4444', 
    '8B5CF6', '06B6D4', 'F97316', 'EC4899'
  ]
  
  const colorIndex = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const backgroundColor = colors[colorIndex]
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=ffffff&size=200&bold=true`
}

export default function ProfileAvatar({ 
  src, 
  name, 
  email, 
  size = 'md', 
  avatarType = 'default',
  showBadge = false,
  className = '' 
}: ProfileAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const badgeClasses = {
    sm: 'text-xs px-1 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-xs px-2 py-1',
    xl: 'text-xs px-2 py-1'
  }

  // Memoize fallback avatar to prevent regeneration on every render
  const fallbackSrc = useMemo(() => 
    generateDefaultAvatar(name || 'User', email || 'user@example.com'),
    [name, email]
  )
  
  // Simple logic: use provided src, or fallback if empty/null
  const imageSrc = src && src.trim() !== '' ? src : fallbackSrc

  const getBadgeColor = () => {
    switch (avatarType) {
      case 'oauth':
        return 'bg-green-500 text-white'
      case 'uploaded':
        return 'bg-purple-500 text-white'
      default:
        return 'bg-blue-500 text-white'
    }
  }

  const getBadgeText = () => {
    switch (avatarType) {
      case 'oauth':
        return 'OAuth'
      case 'uploaded':
        return 'Custom'
      default:
        return 'Default'
    }
  }

  return (
    <div className={`relative ${className}`}>
      <img
        src={imageSrc}
        alt={name || 'Profile'}
        className={`${sizeClasses[size]} rounded-full border-2 border-gray-200 object-cover`}
        onError={(e) => {
          // Only switch to fallback if we're not already showing it
          if (e.currentTarget.src !== fallbackSrc) {
            e.currentTarget.src = fallbackSrc
          }
        }}
      />
      
      {showBadge && (
        <div className={`absolute -bottom-1 -right-1 ${getBadgeColor()} ${badgeClasses[size]} rounded-full font-medium`}>
          {getBadgeText()}
        </div>
      )}
    </div>
  )
}