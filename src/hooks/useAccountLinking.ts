'use client'

import { useState, useCallback } from 'react'
import { LinkingCandidate } from '@/lib/enhanced-account-linking'

interface UseAccountLinkingResult {
  candidates: LinkingCandidate[]
  isLoading: boolean
  error: string | null
  showLinkingModal: boolean
  findCandidates: (email?: string, phoneNumber?: string, name?: string) => Promise<void>
  linkAccounts: (primaryUserId: string, secondaryUserIds: string[]) => Promise<boolean>
  setShowLinkingModal: (show: boolean) => void
  resetState: () => void
}

export function useAccountLinking(): UseAccountLinkingResult {
  const [candidates, setCandidates] = useState<LinkingCandidate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLinkingModal, setShowLinkingModal] = useState(false)

  const findCandidates = useCallback(async (
    email?: string, 
    phoneNumber?: string, 
    name?: string
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/account-linking/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phoneNumber, name })
      })

      if (!response.ok) {
        throw new Error('Failed to find linking candidates')
      }

      const data = await response.json()
      setCandidates(data.candidates || [])
      
      if (data.candidates && data.candidates.length > 0) {
        setShowLinkingModal(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const linkAccounts = useCallback(async (
    primaryUserId: string, 
    secondaryUserIds: string[]
  ): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/account-linking/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          primaryUserId, 
          secondaryUserIds,
          createNewGroup: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to link accounts')
      }

      setShowLinkingModal(false)
      setCandidates([])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetState = useCallback(() => {
    setCandidates([])
    setError(null)
    setShowLinkingModal(false)
    setIsLoading(false)
  }, [])

  return {
    candidates,
    isLoading,
    error,
    showLinkingModal,
    findCandidates,
    linkAccounts,
    setShowLinkingModal,
    resetState
  }
}

