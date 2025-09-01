import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useBackendQuery } from './use-backend-query'
import { useOfflineGuard } from './use-offline-guard'

interface UseAdminAccessOptions {
  requiredScope?: string
  autoFetch?: boolean
  onAccessGranted?: () => void
  onAccessDenied?: () => void
}

interface UseAdminAccessReturn {
  hasAdminAccess: boolean
  loading: boolean
  error: string | null
  checkAccess: () => Promise<void>
}

/**
 * Custom hook for checking admin access permissions
 */
export function useAdminAccess(options: UseAdminAccessOptions = {}): UseAdminAccessReturn {
  const {
    requiredScope = 'manage:plans',
    autoFetch = true,
    onAccessGranted,
    onAccessDenied
  } = options

  const { isAuthenticated } = useAuth0()
  const { guard } = useOfflineGuard()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use useBackendQuery for the admin access check with built-in retry logic
  const { data: adminData, isLoading: queryLoading, error: queryError } = useBackendQuery<{ hasAccess: boolean }>(
    '/api/admin/check-access',
    {
      queryKey: ['admin-access'],
      enabled: isAuthenticated && autoFetch,
      requireAuth: true,
      // Don't retry on permission errors (401, 403) - these won't change
      // The retry logic is handled by useBackendQuery automatically
    }
  )

  const checkAccess = async () => {
    if (!isAuthenticated) {
      setHasAdminAccess(false)
      setLoading(false)
      return
    }

    // In development mode, allow admin access for testing purposes
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Bypassing admin access check')
      setHasAdminAccess(true)
      setLoading(false)
      onAccessGranted?.()
      return
    }

    try {
      // Check if backend is online before proceeding
      guard()
      
      setLoading(true)
      setError(null)
      
      // If we have fresh data from useBackendQuery, use it
      if (adminData) {
        setHasAdminAccess(adminData.hasAccess)
        if (adminData.hasAccess) {
          onAccessGranted?.()
        } else {
          onAccessDenied?.()
        }
        setError(null)
      } else if (queryError) {
        // Handle query errors
        setHasAdminAccess(false)
        onAccessDenied?.()
        setError('Failed to verify admin permissions')
      }
    } catch (error) {
      // If guard() throws (backend offline), don't set error
      if (error instanceof Error && error.message.includes('Backend is offline')) {
        setHasAdminAccess(false)
        setError(null)
      } else {
        console.error('Failed to check admin access:', error)
        setError('Failed to verify admin permissions')
        setHasAdminAccess(false)
        onAccessDenied?.()
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch) {
      checkAccess()
    }
  }, [isAuthenticated, autoFetch])

  // Update loading state based on query loading
  useEffect(() => {
    if (queryLoading) {
      setLoading(true)
    }
  }, [queryLoading])

  // Update error state based on query error
  useEffect(() => {
    if (queryError) {
      setError('Failed to verify admin permissions')
    } else {
      setError(null)
    }
  }, [queryError])

  // Update admin access state based on query data
  useEffect(() => {
    if (adminData) {
      setHasAdminAccess(adminData.hasAccess)
      if (adminData.hasAccess) {
        onAccessGranted?.()
      } else {
        onAccessDenied?.()
      }
    }
  }, [adminData, onAccessGranted, onAccessDenied])

  return {
    hasAdminAccess,
    loading: loading || queryLoading,
    error,
    checkAccess
  }
}
