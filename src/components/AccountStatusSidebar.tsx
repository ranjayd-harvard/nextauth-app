// src/components/AccountStatusSidebar.tsx
'use client'

import { useState } from 'react'
import { useAccountStatus, getSecurityScoreColor, getSecurityScoreLabel, getSocialAccountIcon } from '@/hooks/useAccountStatus'

interface AccountStatusSidebarProps {
  onRefresh?: () => void
}

export default function AccountStatusSidebar({ onRefresh }: AccountStatusSidebarProps) {
  const { status, isLoading, error, refreshStatus } = useAccountStatus()
  const [showDetails, setShowDetails] = useState(false)

  const handleRefresh = () => {
    refreshStatus()
    onRefresh?.()
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        <div className="text-red-600 text-sm">
          <p>{error}</p>
          <button 
            onClick={handleRefresh}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-gray-600 text-sm"
          title="Refresh status"
        >
          🔄
        </button>
      </div>
      
      {/* Security Score */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Security Score</span>
          <span className={`text-lg font-bold ${getSecurityScoreColor(status.securityScore)}`}>
            {status.securityScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              status.securityScore >= 90 ? 'bg-green-500' :
              status.securityScore >= 70 ? 'bg-blue-500' :
              status.securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${status.securityScore}%` }}
          ></div>
        </div>
        <p className={`text-xs mt-1 ${getSecurityScoreColor(status.securityScore)}`}>
          {getSecurityScoreLabel(status.securityScore)}
        </p>
      </div>

      {/* Status Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Email Verified</span>
          <span className={status.emailVerified ? "text-green-600" : "text-gray-400"}>
            {status.emailVerified ? "✓" : "—"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Phone Verified</span>
          <span className={status.phoneVerified ? "text-green-600" : "text-gray-400"}>
            {status.phoneVerified ? "✓" : "—"}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Social Accounts</span>
          <div className="flex items-center space-x-1">
            {status.socialAccounts.hasAny ? (
              <>
                <span className="text-green-600">✓</span>
                <span className="text-xs text-gray-500">({status.socialAccounts.count})</span>
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Two-Factor Auth</span>
          <div className="flex items-center space-x-1">
            {status.twoFactorAuth.enabled ? (
              <>
                <span className="text-green-600">✓</span>
                {status.twoFactorAuth.hasBackupCodes && (
                  <span className="text-xs text-green-600" title="Backup codes available">🔑</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          {status.socialAccounts.hasAny && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Connected Social Accounts:</p>
              <div className="flex flex-wrap gap-1">
                {status.socialAccounts.providers.map((provider, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                    title={provider}
                  >
                    <span>{getSocialAccountIcon(provider)}</span>
                    <span className="capitalize">{provider}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {status.twoFactorAuth.enabled && (
            <div>
              <p className="text-xs font-medium text-gray-700">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">
                {status.twoFactorAuth.hasBackupCodes 
                  ? 'Enabled with backup codes' 
                  : 'Enabled (consider generating backup codes)'}
              </p>
            </div>
          )}

          {status.lastSecurityUpdate && (
            <div>
              <p className="text-xs font-medium text-gray-700">Last Security Update</p>
              <p className="text-xs text-gray-500">
                {new Date(status.lastSecurityUpdate).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Security Recommendations */}
          {status.securityScore < 100 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs font-medium text-yellow-800 mb-1">Recommendations:</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {!status.emailVerified && <li>• Verify your email address</li>}
                {!status.phoneVerified && <li>• Verify your phone number</li>}
                {!status.socialAccounts.hasAny && <li>• Connect a social account</li>}
                {!status.twoFactorAuth.enabled && <li>• Enable two-factor authentication</li>}
                {status.twoFactorAuth.enabled && !status.twoFactorAuth.hasBackupCodes && (
                  <li>• Generate backup codes for 2FA</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}