'use client'

import { useState } from 'react'

interface LinkingCandidate {
  userId: string
  email?: string
  phoneNumber?: string
  name: string
  authMethod: string
  confidence: number
  matchReason: string[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  candidates: LinkingCandidate[]
  onMerge: (userId: string) => Promise<void>
}

export default function AccountLinkingModal({ isOpen, onClose, candidates, onMerge }: Props) {
  const [selectedAccount, setSelectedAccount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  if (!isOpen) return null

  const handleMerge = async () => {
    if (!selectedAccount) return
    
    setIsLoading(true)
    try {
      await onMerge(selectedAccount)
      onClose()
    } catch (error) {
      console.error('Merge failed:', error)
    } finally {
      setIsLoading(false)
      setShowConfirmation(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-orange-600 bg-orange-100'
  }

  const getAuthIcon = (method: string) => {
    switch (method) {
      case 'credentials': return '📧'
      case 'phone': return '📱'
      case 'google': return '🔴'
      case 'github': return '⚫'
      default: return '🔐'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {!showConfirmation ? (
          <>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Link Accounts</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                We found existing accounts that might be yours.
              </p>
            </div>

            {/* Candidates */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.userId}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${
                      selectedAccount === candidate.userId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAccount(candidate.userId)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span>{getAuthIcon(candidate.authMethod)}</span>
                          <h3 className="font-medium">{candidate.name}</h3>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                          {candidate.email && <div>📧 {candidate.email}</div>}
                          {candidate.phoneNumber && <div>📱 {candidate.phoneNumber}</div>}
                        </div>
                        
                        <div className="mt-2 flex gap-1">
                          {candidate.matchReason.map((reason, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-gray-100 rounded-full"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(candidate.confidence)}`}>
                        {candidate.confidence}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
              >
                Not Now
              </button>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedAccount}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50"
              >
                Link Account
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation */}
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                ⚠️
              </div>
              
              <h3 className="text-lg font-bold mb-2">Confirm Account Linking</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will merge the accounts. You'll be able to sign in using any method.
              </p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-sm font-medium">⚠️ This action cannot be undone</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMerge}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl disabled:opacity-50"
                >
                  {isLoading ? 'Linking...' : 'Yes, Link'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
