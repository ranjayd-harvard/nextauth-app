// src/app/profile/page.tsx
'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useSession } from 'next-auth/react'

export default function Profile() {
  const { data: session } = useSession()

  return (
    <ProtectedRoute>
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">User Profile</h1>
          <div className="border-l-4 border-green-400 bg-green-50 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  🔐 Another protected page - authentication required!
                </p>
              </div>
            </div>
          </div>
          {session && (
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <img
                    className="h-24 w-24 rounded-full border-4 border-gray-200"
                    src={session.user?.image || ''}
                    alt={session.user?.name || ''}
                  />
                  {session.user?.avatarType === 'default' && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Default
                    </div>
                  )}
                  {session.user?.avatarType === 'oauth' && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      OAuth
                    </div>
                  )}
                  {session.user?.avatarType === 'uploaded' && (
                    <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                      Custom
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{session.user?.name}</h2>
                  <p className="text-gray-600">{session.user?.email}</p>
                  {session.user?.registerSource && (
                    <p className="text-sm text-blue-600 mt-1">
                      Registered via: {session.user.registerSource}
                    </p>
                  )}
                  {session.user?.avatarType === 'default' && (
                    <p className="text-sm text-gray-500 mt-2">
                      💡 You can upload a custom profile picture later
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t pt-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{session.user?.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{session.user?.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registration source</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.user?.registerSource === 'credentials' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {session.user?.registerSource || 'Unknown'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current provider</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.user?.provider === 'credentials' 
                          ? 'bg-blue-100 text-blue-800'
                          : session.user?.provider === 'google'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.user?.provider || 'Unknown'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Avatar type</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        session.user?.avatarType === 'default'
                          ? 'bg-blue-100 text-blue-800'
                          : session.user?.avatarType === 'oauth'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {session.user?.avatarType === 'default' ? 'Generated Avatar' :
                         session.user?.avatarType === 'oauth' ? 'OAuth Profile' :
                         session.user?.avatarType === 'uploaded' ? 'Custom Upload' : 'Unknown'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Profile actions</dt>
                    <dd className="mt-1 text-sm">
                      {session.user?.avatarType === 'default' && (
                        <button className="bg-blue-600 text-white px-3 py-1 rounded-md text-xs hover:bg-blue-700 transition-colors">
                          Upload Custom Photo
                        </button>
                      )}
                      {session.user?.avatarType !== 'default' && (
                        <button className="bg-gray-600 text-white px-3 py-1 rounded-md text-xs hover:bg-gray-700 transition-colors">
                          Change Photo
                        </button>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {session.user?.phoneNumber || 'Not provided'}
                      {session.user?.phoneNumber && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </dd>
                  </div>                  
                </dl>
              </div>

              {/* Additional Profile Stats Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {session.user?.registerSource === 'credentials' ? '🔐' : '🌐'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {session.user?.registerSource === 'credentials' ? 'Secure Login' : 'Social Login'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {session.user?.avatarType === 'default' ? '🎨' : 
                         session.user?.avatarType === 'oauth' ? '📷' : '📁'}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {session.user?.avatarType === 'default' ? 'Generated Avatar' :
                         session.user?.avatarType === 'oauth' ? 'Profile Picture' : 'Custom Photo'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">✨</div>
                      <div className="text-sm text-gray-600 mt-1">Active Session</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}