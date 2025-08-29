import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

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
 * 
 * @example
 * ```tsx
 * // Basic usage
 * const { hasAdminAccess, loading, error } = useAdminAccess()
 * 
 * // With custom scope
 * const { hasAdminAccess } = useAdminAccess({ 
 *   requiredScope: 'manage:users' 
 * })
 * 
 * // With callbacks
 * const { hasAdminAccess } = useAdminAccess({
 *   onAccessGranted: () => console.log('Admin access granted'),
 *   onAccessDenied: () => console.log('Access denied')
 * })
 * 
 * // Manual control
 * const { hasAdminAccess, checkAccess } = useAdminAccess({ 
 *   autoFetch: false 
 * })
 * 
 * useEffect(() => {
 *   checkAccess()
 * }, [])
 * ```
 */
export function useAdminAccess(options: UseAdminAccessOptions = {}): UseAdminAccessReturn {
  const {
    requiredScope = 'manage:plans',
    autoFetch = true,
    onAccessGranted,
    onAccessDenied
  } = options

  const { isAuthenticated, getAccessTokenSilently } = useAuth0()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAccess = async () => {
    if (!isAuthenticated) {
      setHasAdminAccess(false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const token = await getAccessTokenSilently()
      
      // Check if token contains the required scope
      const response = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setHasAdminAccess(true)
        onAccessGranted?.()
      } else {
        setHasAdminAccess(false)
        onAccessDenied?.()
      }
    } catch (error) {
      console.error('Failed to check admin access:', error)
      setError('Failed to verify admin permissions')
      setHasAdminAccess(false)
      onAccessDenied?.()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch) {
      checkAccess()
    }
  }, [isAuthenticated, autoFetch])

  return {
    hasAdminAccess,
    loading,
    error,
    checkAccess
  }
}
