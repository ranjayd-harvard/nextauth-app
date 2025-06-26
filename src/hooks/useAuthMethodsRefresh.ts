// src/hooks/useAuthMethodsRefresh.ts
import { useCallback } from 'react'

/**
 * Hook to refresh the authentication methods count in the navigation
 * This should be called after adding/removing authentication methods
 */
export const useAuthMethodsRefresh = () => {
  const refreshNavigationAuthCount = useCallback(() => {
    try {
      console.log('🔄 Dispatching refreshAuthMethods event...')
      // Dispatch a custom event that the navigation component listens to
      const event = new CustomEvent('refreshAuthMethods')
      window.dispatchEvent(event)
    } catch (error) {
      console.error('Failed to refresh auth methods count:', error)
    }
  }, [])

  return { refreshNavigationAuthCount }
}