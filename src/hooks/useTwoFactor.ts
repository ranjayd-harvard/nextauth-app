import { useState } from 'react'

export interface TwoFactorStatus {
  enabled: boolean
  hasBackupCodes: boolean
  backupCodesCount?: number
  setupInProgress?: boolean
}

export function useTwoFactor() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)

  const fetchStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/two-factor')
      const data = await response.json()

      if (response.ok) {
        setStatus({
          enabled: data.enabled,
          hasBackupCodes: data.hasBackupCodes,
          setupInProgress: !data.enabled && !!data.secret
        })
      } else {
        setError(data.error || 'Failed to fetch 2FA status')
      }
    } catch (err) {
      setError('Failed to fetch 2FA status')
    } finally {
      setIsLoading(false)
    }
  }

  const startSetup = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/two-factor')
      const data = await response.json()

      if (response.ok && !data.enabled) {
        return {
          success: true,
          qrCode: data.qrCode,
          manualEntryKey: data.manualEntryKey,
          secret: data.secret
        }
      } else {
        setError(data.error || 'Failed to start 2FA setup')
        return { success: false }
      }
    } catch (err) {
      setError('Failed to start 2FA setup')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  const enable2FA = async (token: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await response.json()

      if (response.ok) {
        await fetchStatus() // Refresh status
        return {
          success: true,
          backupCodes: data.backupCodes
        }
      } else {
        setError(data.error || 'Failed to enable 2FA')
        return { success: false }
      }
    } catch (err) {
      setError('Failed to enable 2FA')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async (password: string, token?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/two-factor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token })
      })

      const data = await response.json()

      if (response.ok) {
        await fetchStatus() // Refresh status
        return { success: true }
      } else {
        setError(data.error || 'Failed to disable 2FA')
        return { success: false }
      }
    } catch (err) {
      setError('Failed to disable 2FA')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateBackupCodes = async (password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (response.ok) {
        await fetchStatus() // Refresh status
        return {
          success: true,
          backupCodes: data.backupCodes
        }
      } else {
        setError(data.error || 'Failed to regenerate backup codes')
        return { success: false }
      }
    } catch (err) {
      setError('Failed to regenerate backup codes')
      return { success: false }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    status,
    isLoading,
    error,
    fetchStatus,
    startSetup,
    enable2FA,
    disable2FA,
    regenerateBackupCodes
  }
}

