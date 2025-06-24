// src/app/account/activity/page.tsx
'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useUserActivities, getActivityIcon, getSeverityColor, getCategoryColor, formatTimeAgo, UserActivity } from '@/hooks/useUserActivities'
import { ActivityCategory } from '@/lib/activity-tracker'

export default function UserActivityPage() {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  
  const {
    activities,
    summary,
    isLoading,
    error,
    fetchActivities
  } = useUserActivities()

  const handleCategoryFilter = (category: ActivityCategory | 'all') => {
    setSelectedCategory(category)
    fetchActivities({
      category: category === 'all' ? undefined : category,
      limit: 100,
      includeStats: true
    })
  }

  const filteredActivities = selectedCategory === 'all' 
    ? activities 
    : activities.filter(activity => activity.category === selectedCategory)

  const categories: { key: ActivityCategory | 'all', label: string, icon: string }[] = [
    { key: 'all', label: 'All Activity', icon: '📊' },
    { key: 'authentication', label: 'Authentication', icon: '🔐' },
    { key: 'security', label: 'Security', icon: '🛡️' },
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'account', label: 'Account', icon: '🔗' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
    { key: 'data', label: 'Data', icon: '📦' }
  ]

  const groupActivitiesByDate = (activities: UserActivity[]) => {
    const groups: Record<string, UserActivity[]> = {}
    
    activities.forEach(activity => {
      const dateKey = activity.timestamp.toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })
    
    return groups
  }

  const activityGroups = groupActivitiesByDate(filteredActivities)

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity History</h1>
          <p className="mt-2 text-gray-600">
            Track all your account activities and security events
          </p>
        </div>

        {/* Activity Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-xl">📊</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalActivities}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <span className="text-xl">🛡️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Security Events</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.securityEvents}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-xl">🔓</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Last Sign In</p>
                  <p className="text-sm font-bold text-gray-900">
                    {summary.recentLogin ? formatTimeAgo(summary.recentLogin) : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(summary.bySeverity.high || 0) + (summary.bySeverity.critical || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryFilter(category.key)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                  {summary && category.key !== 'all' && (
                    <span className="bg-white text-gray-600 px-2 py-0.5 rounded-full text-xs">
                      {summary.byCategory[category.key as ActivityCategory] || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Timeline
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {error && (
            <div className="p-6 border-b border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <span className="text-red-400">⚠️</span>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 py-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activities found</h3>
              <p className="text-gray-600">
                {selectedCategory === 'all' 
                  ? 'No activities have been recorded yet.' 
                  : `No ${selectedCategory} activities found.`}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-gray-200">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">{getActivityIcon(activity.type)}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{activity.action}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                          {activity.category}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                          {activity.severity}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-4">
                          <span>{formatTimeAgo(activity.timestamp)}</span>
                          {activity.device && (
                            <>
                              <span>•</span>
                              <span>{activity.device}</span>
                            </>
                          )}
                          {activity.ip && (
                            <>
                              <span>•</span>
                              <span>{activity.ip}</span>
                            </>
                          )}
                        </div>
                        
                        {Object.keys(activity.details).length > 0 && (
                          <div className="mt-2">
                            <details className="text-xs">
                              <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                                View details
                              </summary>
                              <pre className="mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(activity.details, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Timeline View
            <div className="p-6">
              {Object.entries(activityGroups).map(([date, dayActivities]) => (
                <div key={date} className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="bg-gray-100 rounded-lg px-3 py-1">
                      <h3 className="text-sm font-medium text-gray-900">{date}</h3>
                    </div>
                    <div className="flex-1 ml-4 border-t border-gray-200"></div>
                    <span className="ml-4 text-xs text-gray-500">{dayActivities.length} events</span>
                  </div>
                  
                  <div className="space-y-4 ml-4">
                    {dayActivities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm">{getActivityIcon(activity.type)}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{activity.action}</h4>
                            <span className="text-xs text-gray-500">
                              {activity.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(activity.category)}`}>
                              {activity.category}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(activity.severity)}`}>
                              {activity.severity}
                            </span>
                            {activity.device && (
                              <span className="text-xs text-gray-500">{activity.device}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}