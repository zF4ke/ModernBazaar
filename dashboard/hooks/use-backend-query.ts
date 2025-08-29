import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchWithBackendUrl } from "@/lib/api"
import { useAuth0 } from '@auth0/auth0-react'

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
  const { queryKey = [], enabled = true, requireAuth = false, ...queryOptions } = options
  const { getAccessTokenSilently, isAuthenticated } = useAuth0()
  const apiEndpoint = typeof window !== 'undefined'
    ? localStorage.getItem('apiEndpoint') || 'default'
    : 'default'
  return useQuery<T>({
    queryKey: [endpoint, apiEndpoint, requireAuth ? 'auth' : 'anon', ...queryKey],
    queryFn: async () => {
      let token: string | undefined
      if (requireAuth) {
        if (!isAuthenticated) throw new Error('Not authenticated')
        token = await getAccessTokenSilently({})
      }
      const response = await fetchWithBackendUrl(endpoint, {}, token)
      if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`)
      return response.json()
    },
    enabled: enabled && (!requireAuth || isAuthenticated),
    ...queryOptions,
  })
}
