'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { UserWithGroup } from '@/lib/enhanced-account-linking'

interface AccountGroupManagerProps {
  className?: string
}

export default function AccountGroupManager({ className }: AccountGroupManagerProps) {
  const { data: session } = useSession()
  const [groupAccounts, setGroupAccounts] = useState<UserWithGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserGroup()
    }
  }, [session])

  const fetchUserGroup = async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    try {
      // First, try to get the user's group ID
      const response = await fetch('/api/auth/account-linking/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          phoneNumber: session.user.phoneNumber,
          excludeUserId: session.user.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Check if current user has a group
        if (data.candidates.length > 0 && data.candidates[0].groupId) {
          setGroupId(data.candidates[0].groupId)
          await fetchGroupAccounts(data.candidates[0].groupId)
        }
      }
    } catch (error) {
      console.error('Error fetching user group:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchGroupAccounts = async (targetGroupId: string) => {
    try {
      const response = await fetch(`/api/auth/account-linking/group?groupId=${targetGroupId}`)
      
      if (response.ok) {
        const data = await response.json()
        setGroupAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error fetching group accounts:', error)
    }
  }

  const createGroup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/account-linking/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.user?.id })
      })
      
      if (response.ok) {
        const data = await response.json()
        setGroupId(data.groupId)
        await fetchGroupAccounts(data.groupId)
      }
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsLoading(false)
    }
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

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <span>🔗</span>
          <span>Linked Accounts</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage your linked authentication methods
        </p>
      </div>

      <div className="p-6">
        {!groupId ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🔗</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No Linked Accounts
            </h4>
            <p className="text-gray-600 mb-4">
              Create an account group to link multiple authentication methods
            </p>
            <button
              onClick={createGroup}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Account Group
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">Group ID: {groupId}</h4>
                <p className="text-sm text-gray-600">
                  {groupAccounts.filter(a => a.isActive).length} active, {groupAccounts.filter(a => !a.isActive).length} merged
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {groupAccounts.map((account) => (
                <div
                  key={account._id.toString()}
                  className={`border rounded-lg p-4 ${
                    account.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                          {account.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {account.name}
                            {account.isMaster && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {account.email && `📧 ${account.email}`}
                            {account.email && account.phoneNumber && ' • '}
                            {account.phoneNumber && `📱 ${account.phoneNumber}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {account.authMethods.map((method) => (
                          <span
                            key={method}
                            className="inline-flex items-center space-x-1 text-xs bg-white px-2 py-1 rounded border"
                            title={method}
                          >
                            <span>{getAuthMethodIcon(method)}</span>
                          </span>
                        ))}
                      </div>

                      <div className={`text-xs px-2 py-1 rounded ${
                        account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {account.isActive ? 'Active' : 'Merged'}
                      </div>
                    </div>
                  </div>

                  {account.lastSignIn && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last sign in: {new Date(account.lastSignIn).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}