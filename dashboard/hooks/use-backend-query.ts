import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchWithBackendUrl } from "@/lib/api"
import { useUser } from '@auth0/nextjs-auth0'
import { AppError, errorStatus } from "@/types/errors"

/**
 * Helper function to determine if an error should be suppressed from logging/retrying
 * @param error The error to check
 * @returns true if the error should be suppressed
 */
export function isExpectedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Suppress common network errors
  if (error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed') ||
      error.message.includes('Invalid URL') ||
      error.message.includes('Failed to parse URL')) {
    return true
  }

  // Suppress 404 errors (resource not found)
  if (errorStatus(error) === 404 || error.message.includes('404')) {
    return true
  }

  return false
}

/**
 * Custom hook that wraps useQuery with automatic backend URL dependency
 * and uses fetchWithBackendUrl for all requests.
 * 
 * This hook provides a convenient way to make authenticated and unauthenticated
 * requests to the backend API with automatic token handling and error management.
 * 
 * @template T - The type of data returned by the query
 * @param endpoint - The API endpoint to query (e.g., '/api/plans')
 * @param options - Query options including authentication requirements
 * @param options.queryKey - Additional query key segments for React Query
 * @param options.enabled - Whether the query should run automatically
 * @param options.requireAuth - Whether authentication is required for this request
 * @param options.queryOptions - Additional React Query options
 * 
 * @returns React Query result with automatic backend URL handling
 */
export function useBackendQuery<T>(
  endpoint: string,
  options: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> & {
    queryKey?: string[]
    enabled?: boolean
    requireAuth?: boolean
  } = {}
) {
  // Default to authenticated requests; pass requireAuth: false to opt out
  const { queryKey = [], enabled = true, requireAuth = true, ...queryOptions } = options
  // nextjs-auth0 v4: auth state comes from the session cookie. The proxy routes
  // attach the access token server-side, so the browser never handles a token.
  const { user } = useUser()
  const isAuthenticated = !!user
  const apiEndpoint = typeof window !== 'undefined'
    ? localStorage.getItem('apiEndpoint') || 'default'
    : 'default'

  return useQuery<T>({
    queryKey: [endpoint, apiEndpoint, requireAuth ? 'auth' : 'anon', ...queryKey],
    queryFn: async () => {
      if (requireAuth && !isAuthenticated) throw new Error('Not authenticated')
      const response = await fetchWithBackendUrl(endpoint)
      if (!response.ok) {
        // Carry the status code on a typed error for downstream handling
        throw new AppError(`Failed to fetch ${endpoint}`, response.status)
      }
      return response.json()
    },
    enabled: enabled && (!requireAuth || isAuthenticated),
    // Smart retry logic - don't retry on permission errors
    retry: (failureCount, error) => {
      const status = errorStatus(error)
      // Don't retry on permission errors (401, 403) - these won't change
      if (status === 401 || status === 403) {
        console.log(`🚫 Permission error (${status}) for ${endpoint} - not retrying`)
        return false
      }

      // Don't retry on 404 - resource doesn't exist
      if (status === 404) {
        console.log(`🚫 Resource not found (404) for ${endpoint} - not retrying`)
        return false
      }

      // Don't retry on 422 - validation errors won't change
      if (status === 422) {
        console.log(`🚫 Validation error (422) for ${endpoint} - not retrying`)
        return false
      }

      // Retry up to 2 times for other errors (network issues, 500s, etc.)
      if (failureCount < 2) {
        console.log(`🔄 Retrying ${endpoint} (attempt ${failureCount + 1}/3)`)
        return true
      }
      
      console.log(`❌ Max retries reached for ${endpoint}`)
      return false
    },
    // Longer retry delay to avoid spamming
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 1s, 2s, 4s, 8s, 10s max
    ...queryOptions,
  })
}
