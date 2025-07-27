/**
 * Custom fetch function that automatically includes the configured backend URL
 * from localStorage as a header for API routes to use
 */
export async function fetchWithBackendUrl(url: string, options: RequestInit = {}) {
  // Get the configured backend URL from localStorage
  const configuredBackendUrl = typeof window !== 'undefined' 
    ? localStorage.getItem('apiEndpoint') 
    : null

  // Add the backend URL header if configured
  const headers = new Headers(options.headers)
  if (configuredBackendUrl) {
    headers.set('x-backend-url', configuredBackendUrl)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Utility function for backend API routes to fetch from the actual backend
 * with proper error handling and URL resolution
 */
export async function fetchFromBackend(
  request: Request, 
  endpoint: string, 
  options: RequestInit = {}
) {
  const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080"
  let backendUrl = request.headers.get('x-backend-url') || DEFAULT_BACKEND_URL
  
  // Clean up the backend URL - ensure it doesn't end with a slash
  backendUrl = backendUrl.replace(/\/+$/, '')
  
  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  // Construct the full URL
  const fullUrl = `${backendUrl}${cleanEndpoint}`
  
  try {
    // Validate URL before making the request
    new URL(fullUrl) // This will throw if URL is invalid
    
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`Backend request failed with status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Don't log common expected errors
    const isExpectedError = error instanceof Error && (
      error.message.includes('ECONNREFUSED') || 
      error.message.includes('fetch failed') ||
      error.message.includes('Invalid URL') ||
      error.message.includes('Failed to parse URL')
    )
    
    if (!isExpectedError) {
      console.error(`Error fetching from backend ${endpoint}:`, error)
    }
    
    throw error
  }
}

/**
 * Build query parameters from an object, excluding undefined/empty values
 */
export function buildQueryParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.append(key, value.toString())
    }
  })
  
  return searchParams
} 