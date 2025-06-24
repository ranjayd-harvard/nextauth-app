// src/hooks/useAccountStatus.ts
import { useState, useEffect } from 'react'
import { AccountStatus } from '@/app/api/user/account-status/route'

export function useAccountStatus() {
  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccountStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/account-status')
      const data = await response.json()

      if (response.ok) {
        setStatus(data.status)
      } else {
        setError(data.error || 'Failed to fetch account status')
      }
    } catch (err) {
      setError('Failed to fetch account status')
      console.error('Account status fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshStatus = () => {
    fetchAccountStatus()
  }

  useEffect(() => {
    fetchAccountStatus()
  }, [])

  return {
    status,
    isLoading,
    error,
    refreshStatus
  }
}

export function getSecurityScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-blue-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function getSecurityScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Needs Improvement'
}

export function getSocialAccountIcon(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'google': return '🔴'
    case 'github': return '⚫'
    case 'facebook': return '🔵'
    case 'twitter': return '🐦'
    case 'linkedin': return '🔗'
    case 'microsoft': return '🟦'
    default: return '🌐'
  }
}