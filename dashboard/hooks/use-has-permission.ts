import { useState, useEffect, useCallback } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useAdminAccess } from './use-admin-access'
import { useBackendQuery } from './use-backend-query'
import { useOfflineGuard } from './use-offline-guard'
import { Permission } from '@/constants/permissions'
import { UserPermissions } from '@/types/permissions'

interface UseHasPermissionReturn {
  hasPermission: boolean
  hasAdminAccess: boolean
  loading: boolean
  error: string | null
  checkPermission: () => Promise<void>
}

// Cache for user permissions to avoid repeated API calls
const permissionsCache = new Map<string, { data: UserPermissions; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Generic hook for checking specific permissions
 * @param requiredPermissions - Array of permissions to check (user needs ALL of them)
 */
export function useHasPermission(requiredPermissions: Permission | Permission[]): UseHasPermissionReturn {
  const { isAuthenticated } = useAuth0()
  const { hasAdminAccess } = useAdminAccess()
  const { guard } = useOfflineGuard()
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Normalize to array
  const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]

  // Use useBackendQuery for the permissions API call with built-in retry logic
  const { data: permissionsData, isLoading: queryLoading, error: queryError } = useBackendQuery<UserPermissions>(
    '/api/me/permissions',
    {
      queryKey: ['permissions'],
      enabled: isAuthenticated,
      requireAuth: true,
      // Don't retry on permission errors (401, 403) - these won't change
      // The retry logic is handled by useBackendQuery automatically
    }
  )

  const checkPermission = useCallback(async () => {
    if (!isAuthenticated) {
      setHasPermission(false)
      setLoading(false)
      return
    }

    try {
      // Check if backend is online before proceeding
      guard()
      
      setLoading(true)
      setError(null)
      
      // Check cache first
      const cacheKey = `permissions_${permissionsArray.join('_')}`
      const cached = permissionsCache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Use cached permissions
        const userHasAllPermissions = permissionsArray.every(permission => 
          cached.data.permissions.includes(permission)
        )
        setHasPermission(userHasAllPermissions)
        setLoading(false)
        return
      }
      
      // If we have fresh data from useBackendQuery, use it
      if (permissionsData) {
        // Cache the permissions
        permissionsCache.set(cacheKey, {
          data: permissionsData,
          timestamp: Date.now()
        })
        
        // Check if user has all required permissions
        const userHasAllPermissions = permissionsArray.every(permission => 
          permissionsData.permissions.includes(permission)
        )
        
        setHasPermission(userHasAllPermissions)
        setError(null)
      } else if (queryError) {
        // Handle query errors
        if ((queryError as any).status === 403) {
          setHasPermission(false)
          setError(null)
        } else {
          setError('Failed to verify permissions')
          setHasPermission(false)
        }
      }
    } catch (error) {
      // If guard() throws (backend offline), don't set error
      if (error instanceof Error && error.message.includes('Backend is offline')) {
        setHasPermission(false)
        setError(null)
      } else {
        console.error(`Failed to check permissions ${permissionsArray.join(', ')}:`, error)
        setError('Failed to verify permissions')
        setHasPermission(false)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, guard, permissionsArray, permissionsData, queryError])

  useEffect(() => {
    checkPermission()
  }, [checkPermission])

  // Update loading state based on query loading
  useEffect(() => {
    if (queryLoading) {
      setLoading(true)
    }
  }, [queryLoading])

  // Update error state based on query error
  useEffect(() => {
    if (queryError) {
      if ((queryError as any).status === 403) {
        setError(null) // Don't show error for permission denied
      } else {
        setError('Failed to verify permissions')
      }
    } else {
      setError(null)
    }
  }, [queryError])

  return {
    hasPermission,
    hasAdminAccess,
    loading: loading || queryLoading,
    error,
    checkPermission
  }
}
