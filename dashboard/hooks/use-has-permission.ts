import { useUser } from '@auth0/nextjs-auth0'
import { useAdminAccess } from './use-admin-access'
import { useBackendQuery } from './use-backend-query'
import { errorStatus } from '@/types/errors'
import { Permission } from '@/constants/permissions'
import { UserPermissions } from '@/types/permissions'

interface UseHasPermissionReturn {
  hasPermission: boolean
  hasAdminAccess: boolean
  loading: boolean
  error: string | null
  checkPermission: () => Promise<void>
}

/**
 * Checks whether the current user holds ALL of the requested permissions.
 *
 * Derived directly from a single React Query entry (`/api/me/permissions`) — no
 * mirrored state, no effects, and no hand-rolled cache. React Query already
 * dedupes and caches the request, so every consumer shares one stable result
 * and the value transitions unknown -> known exactly once (no flicker).
 */
export function useHasPermission(requiredPermissions: Permission | Permission[]): UseHasPermissionReturn {
  const { user, isLoading: userLoading } = useUser()
  const isAuthenticated = !!user
  const { hasAdminAccess } = useAdminAccess()

  const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]

  const { data, isLoading, error: queryError, refetch } = useBackendQuery<UserPermissions>(
    '/api/me/permissions',
    {
      queryKey: ['permissions'],
      enabled: isAuthenticated,
      requireAuth: true,
      // Entitlements rarely change mid-session; cache them so navigating between
      // gated pages doesn't refetch and re-flash loading states.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  )

  // Only 403 means the authenticated user lacks the entitlement. A 401 means the
  // session token failed and must never be displayed as a lost subscription.
  const status = errorStatus(queryError)
  const isPermissionError = status === 403

  const hasPermission = data ? permissionsArray.every((p) => data.permissions.includes(p)) : false

  return {
    hasPermission,
    hasAdminAccess,
    loading: userLoading || (isAuthenticated && isLoading),
    error: queryError && !isPermissionError
      ? status === 401 ? 'Your session needs to be refreshed' : 'Failed to verify permissions'
      : null,
    checkPermission: async () => { await refetch() },
  }
}
