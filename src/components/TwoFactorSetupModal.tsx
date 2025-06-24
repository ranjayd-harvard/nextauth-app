'use client'

import { useState, useEffect } from 'react'
import { useTwoFactor } from '@/hooks/useTwoFactor'

interface TwoFactorSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function TwoFactorSetupModal({ isOpen, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup')
  const [qrCode, setQrCode] = useState('')
  const [manualKey, setManualKey] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [localError, setLocalError] = useState('')

  const { startSetup, enable2FA, isLoading } = useTwoFactor()

  useEffect(() => {
    if (isOpen && step === 'setup') {
      handleStartSetup()
    }
  }, [isOpen])

  const handleStartSetup = async () => {
    const result = await startSetup()
    if (result.success) {
      setQrCode(result.qrCode)
      setManualKey(result.manualEntryKey)
      setLocalError('')
    } else {
      setLocalError('Failed to start 2FA setup')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!verificationCode || !password) {
      setLocalError('Please fill in all fields')
      return
    }

    const result = await enable2FA(verificationCode, password)
    if (result.success) {
      setBackupCodes(result.backupCodes || [])
      setStep('backup')
    }
  }

  const handleFinish = () => {
    onSuccess()
    onClose()
    // Reset state
    setStep('setup')
    setVerificationCode('')
    setPassword('')
    setBackupCodes([])
    setLocalError('')
  }

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n')
    navigator.clipboard.writeText(codesText)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        
        {/* Setup Step */}
        {step === 'setup' && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Setup Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Scan the QR code with your authenticator app</p>
            </div>

            {qrCode && (
              <div className="text-center mb-4">
                <img src={qrCode} alt="2FA QR Code" className="mx-auto border rounded-lg" />
                
                <button
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                >
                  Can't scan? Enter manually
                </button>
                
                {showManualEntry && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-xs break-all">
                    <p className="font-medium mb-1">Manual Entry Key:</p>
                    <code>{manualKey}</code>
                  </div>
                )}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setStep('verify')}
                disabled={!qrCode}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Verify Setup
              </button>
            </div>
          </>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Verify Setup</h3>
              <p className="text-sm text-gray-600">Enter the code from your authenticator app</p>
            </div>

            {localError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {localError}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
              </div>

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
                  onClick={() => setStep('setup')}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Backup Codes Step */}
        {step === 'backup' && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Save Your Backup Codes</h3>
              <p className="text-sm text-gray-600">Keep these codes safe! You can use them to access your account if you lose your authenticator.</p>
            </div>

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
                ⚠️ <strong>Important:</strong> Store these codes in a safe place. Each code can only be used once.
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

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}