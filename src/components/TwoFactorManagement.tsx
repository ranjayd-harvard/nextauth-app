// src/components/TwoFactorManagement.tsx
'use client'

import { useState, useEffect } from 'react'
import { useTwoFactor } from '@/hooks/useTwoFactor'
import TwoFactorSetupModal from './TwoFactorSetupModal'

export default function TwoFactorManagement() {
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  
  const { 
    status, 
    isLoading, 
    error, 
    fetchStatus, 
    disable2FA, 
    regenerateBackupCodes 
  } = useTwoFactor()

  useEffect(() => {
    fetchStatus()
  }, [])

  const handle2FASuccess = () => {
    fetchStatus() // Refresh status after enabling 2FA
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : status ? (
        <>
          {/* 2FA Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${status.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div>
                  <p className="font-medium text-gray-900">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-600">
                    {status.enabled 
                      ? 'Your account is protected with 2FA' 
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {status.enabled ? '✅ Enabled' : '❌ Disabled'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {!status.enabled ? (
              // Enable 2FA
              <button
                onClick={() => setShowSetupModal(true)}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔐 Enable Two-Factor Authentication
              </button>
            ) : (
              // 2FA is enabled - show management options
              <div className="space-y-3">
                
                {/* Backup Codes Status */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">Backup Codes</span>
                      {status.hasBackupCodes ? (
                        <span className="text-green-600 text-sm">✅ Available</span>
                      ) : (
                        <span className="text-red-600 text-sm">❌ Missing</span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowBackupModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {status.hasBackupCodes ? 'Regenerate' : 'Generate'} Codes
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Backup codes help you regain access if you lose your authenticator device.
                  </p>
                  
                  {!status.hasBackupCodes && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      ⚠️ Generate backup codes to secure your account recovery options.
                    </div>
                  )}
                </div>

                {/* Disable 2FA */}
                <button
                  onClick={() => setShowDisableModal(true)}
                  className="w-full bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  🚫 Disable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Security Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Use apps like Google Authenticator, Authy, or 1Password</li>
              <li>• Save your backup codes in a secure location</li>
              <li>• Don't share your 2FA codes with anyone</li>
              <li>• Consider having multiple authenticator devices</li>
            </ul>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500">
          Failed to load 2FA status
        </div>
      )}

      {/* Modals */}
      <TwoFactorSetupModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onSuccess={handle2FASuccess}
      />

      <DisableTwoFactorModal
        isOpen={showDisableModal}
        onClose={() => setShowDisableModal(false)}
        onSuccess={handle2FASuccess}
      />

      <BackupCodesModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onSuccess={handle2FASuccess}
      />
    </div>
  )
}

// Disable 2FA Modal Component
function DisableTwoFactorModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [localError, setLocalError] = useState('')
  
  const { disable2FA, isLoading } = useTwoFactor()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!password) {
      setLocalError('Password is required')
      return
    }

    const result = await disable2FA(password, verificationCode || undefined)
    if (result.success) {
      onSuccess()
      onClose()
      setPassword('')
      setVerificationCode('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Disable Two-Factor Authentication</h3>
        
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            ⚠️ <strong>Warning:</strong> Disabling 2FA will make your account less secure.
          </p>
        </div>

        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code (Optional)
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code for extra security"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              maxLength={6}
            />
            <p className="text-xs text-gray-600 mt-1">
              Recommended: Enter a code from your authenticator app
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Backup Codes Modal Component
function BackupCodesModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [localError, setLocalError] = useState('')
  const [step, setStep] = useState<'confirm' | 'codes'>('confirm')
  
  const { regenerateBackupCodes, isLoading } = useTwoFactor()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!password) {
      setLocalError('Password is required')
      return
    }

    const result = await regenerateBackupCodes(password)
    if (result.success) {
      setBackupCodes(result.backupCodes || [])
      setStep('codes')
    }
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
    setPassword('')
    setBackupCodes([])
    setStep('confirm')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        
        {step === 'confirm' && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Generate Backup Codes</h3>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ This will replace any existing backup codes. Make sure to save the new ones.
              </p>
            </div>

            {localError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {localError}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Generating...' : 'Generate Codes'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'codes' && (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Your New Backup Codes</h3>
            
            <div className="mb-6">
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-white p-2 rounded border text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={copyBackupCodes}
                className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                📋 Copy All Codes
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Important:</strong> Store these codes safely. Each can only be used once.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              ✅ I've Saved My Backup Codes
            </button>
          </>
        )}
      </div>
    </div>
  )
}