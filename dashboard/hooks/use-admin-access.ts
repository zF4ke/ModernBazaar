import { useUser } from '@auth0/nextjs-auth0'
import { useBackendQuery } from './use-backend-query'
import { errorStatus } from '@/types/errors'

interface UseAdminAccessOptions {
  requiredScope?: string
  autoFetch?: boolean
}

interface UseAdminAccessReturn {
  hasAdminAccess: boolean
  loading: boolean
  error: string | null
  checkAccess: () => Promise<void>
}

// In development we don't have a real backend session, so treat any logged-in
// user as an admin instead of round-tripping /api/admin/check-access (which would
// otherwise resolve later and toggle the Admin UI on, then off — a visible flicker).
const DEV_BYPASS = process.env.NODE_ENV === 'development'

/**
 * Admin access check, derived directly from a single React Query entry.
 *
 * There is intentionally NO mirrored useState/useEffect here: the previous
 * version kept a local copy of the query result and synced it through several
 * effects, which produced render oscillation (Admin section appearing, then
 * disappearing, then coming back). State now has exactly one source of truth,
 * so the value only ever transitions unknown -> known once.
 */
export function useAdminAccess(options: UseAdminAccessOptions = {}): UseAdminAccessReturn {
  const { autoFetch = true } = options
  const { user, isLoading: userLoading } = useUser()
  const isAuthenticated = !!user

  // Skip the network call entirely in dev (bypass) or when there's no session.
  const enabled = isAuthenticated && autoFetch && !DEV_BYPASS

  const { data, isLoading, error: queryError, refetch } = useBackendQuery<{ hasAccess: boolean }>(
    '/api/admin/check-access',
    {
      queryKey: ['admin-access'],
      enabled,
      requireAuth: true,
      // Admin status barely changes; cache it long enough to survive navigation
      // without refetching (and therefore without re-flashing the Admin section).
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  )

  const checkAccess = async () => { await refetch() }

  if (DEV_BYPASS) {
    return { hasAdminAccess: isAuthenticated, loading: userLoading, error: null, checkAccess }
  }

  // 401/403 simply means "not an admin" — not an error worth surfacing.
  const status = errorStatus(queryError)
  const isPermissionError = status === 401 || status === 403

  return {
    hasAdminAccess: data?.hasAccess ?? false,
    loading: userLoading || (enabled && isLoading),
    error: queryError && !isPermissionError ? 'Failed to verify admin permissions' : null,
    checkAccess,
  }
}
