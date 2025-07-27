import { useQuery, UseQueryOptions } from "@tanstack/react-query"
import { fetchWithBackendUrl } from "@/lib/api"

/**
 * Custom hook that wraps useQuery with automatic backend URL dependency
 * and uses fetchWithBackendUrl for all requests
 */
export function useBackendQuery<T>(
  endpoint: string,
  options: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> & {
    queryKey?: string[]
    enabled?: boolean
  } = {}
) {
  const { queryKey = [], enabled = true, ...queryOptions } = options
  
  // Get the API endpoint from localStorage to include in the query key
  const apiEndpoint = typeof window !== 'undefined' 
    ? localStorage.getItem('apiEndpoint') || 'default'
    : 'default'

  return useQuery<T>({
    queryKey: [endpoint, apiEndpoint, ...queryKey],
    queryFn: async () => {
      const response = await fetchWithBackendUrl(endpoint)
      if (!response.ok) throw new Error(`Failed to fetch ${endpoint}`)
      return response.json()
    },
    enabled,
    ...queryOptions,
  })
} 