'use client'

import { useState, useEffect } from 'react'
import { LinkingCandidate } from '@/lib/enhanced-account-linking'

interface AccountLinkingModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: LinkingCandidate[]
  currentUserData: {
    email?: string
    phoneNumber?: string
    name?: string
    userId?: string
  }
  onConfirmLinking: (primaryUserId: string, secondaryUserIds: string[]) => Promise<void>
  isLoading?: boolean
}

export default function AccountLinkingModal({
  isOpen,
  onClose,
  candidates,
  currentUserData,
  onConfirmLinking,
  isLoading = false
}: AccountLinkingModalProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [primaryAccount, setPrimaryAccount] = useState<string>('')

  useEffect(() => {
    if (candidates.length > 0 && !primaryAccount) {
      // Default to highest confidence candidate as primary
      const highest = candidates.reduce((prev, current) => 
        prev.confidence > current.confidence ? prev : current
      )
      setPrimaryAccount(highest.userId)
    }
  }, [candidates, primaryAccount])

  const handleCandidateToggle = (userId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleConfirm = async () => {
    if (!primaryAccount || selectedCandidates.length === 0) return
    
    const secondaryIds = selectedCandidates.filter(id => id !== primaryAccount)
    if (currentUserData.userId && currentUserData.userId !== primaryAccount) {
      secondaryIds.push(currentUserData.userId)
    }
    
    await onConfirmLinking(primaryAccount, secondaryIds)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600 bg-green-100'
    if (confidence >= 85) return 'text-blue-600 bg-blue-100'
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-100'
    return 'text-orange-600 bg-orange-100'
  }

  const getAuthMethodIcon = (method: string) => {
    switch (method) {
      case 'credentials': return '🔐'
      case 'phone': return '📱'
      case 'google': return '🔴'
      case 'github': return '⚫'
      default: return '🌐'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              🔗 Link Your Accounts
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            We found existing accounts that might belong to you. Linking them will allow you to sign in using any method.
          </p>
        </div>

        {/* Current Account Info */}
        <div className="px-6 py-4 bg-blue-50 border-b">
          <h3 className="font-medium text-gray-900 mb-2">Your Current Registration:</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="font-medium">{currentUserData.name}</span>
            {currentUserData.email && (
              <span className="text-gray-600">📧 {currentUserData.email}</span>
            )}
            {currentUserData.phoneNumber && (
              <span className="text-gray-600">📱 {currentUserData.phoneNumber}</span>
            )}
          </div>
        </div>

        {/* Candidates List */}
        <div className="px-6 py-4">
          <h3 className="font-medium text-gray-900 mb-4">
            Select accounts to link ({candidates.length} found):
          </h3>
          
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.userId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedCandidates.includes(candidate.userId)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCandidateToggle(candidate.userId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.includes(candidate.userId)}
                      onChange={() => handleCandidateToggle(candidate.userId)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {candidate.avatar ? (
                            <img
                              src={candidate.avatar}
                              alt={candidate.name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                              {candidate.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{candidate.name}</span>
                        </div>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(candidate.confidence)}`}>
                          {candidate.confidence}% match
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {candidate.email && (
                          <div>📧 {candidate.email}</div>
                        )}
                        {candidate.phoneNumber && (
                          <div>📱 {candidate.phoneNumber}</div>
                        )}
                        
                        <div className="flex items-center space-x-2 mt-2">
                          <span>Auth methods:</span>
                          {candidate.authMethods.map((method) => (
                            <span
                              key={method}
                              className="inline-flex items-center space-x-1 text-xs bg-gray-100 px-2 py-1 rounded"
                            >
                              <span>{getAuthMethodIcon(method)}</span>
                              <span>{method}</span>
                            </span>
                          ))}
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-1">
                          Matched by: {candidate.matchReasons.join(', ')}
                        </div>
                        
                        {candidate.lastSignIn && (
                          <div className="text-xs text-gray-500">
                            Last sign in: {new Date(candidate.lastSignIn).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="radio"
                        name="primaryAccount"
                        checked={primaryAccount === candidate.userId}
                        onChange={() => setPrimaryAccount(candidate.userId)}
                        className="text-blue-600"
                      />
                      <span className="text-gray-600">Primary</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Account Selection Info */}
        {selectedCandidates.length > 0 && (
          <div className="px-6 py-3 bg-yellow-50 border-t border-b">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600">ℹ️</span>
              <div className="text-sm text-yellow-800">
                <strong>Primary Account:</strong> The primary account will keep all data and become your main account. 
                Other accounts will be merged into it and marked as linked.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            Skip for now
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCandidates.length === 0 || !primaryAccount || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>
                {isLoading ? 'Linking...' : `Link ${selectedCandidates.length} Account${selectedCandidates.length !== 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
