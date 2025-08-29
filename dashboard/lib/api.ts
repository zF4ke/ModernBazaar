/**
 * Custom fetch function that automatically includes the configured backend URL
 * from localStorage as a header for API routes to use.
 * 
 * This function is used by frontend components to make requests to Next.js API routes
 * while passing the configured backend URL for the API routes to use.
 * 
 * @param url - The URL to fetch from (typically a Next.js API route)
 * @param options - Standard fetch options (method, headers, body, etc.)
 * @param accessToken - Optional JWT token for authenticated requests
 * @returns Promise that resolves to a Response object
 */
export async function fetchWithBackendUrl(url: string, options: RequestInit = {}, accessToken?: string) {
  // Get the configured backend URL from localStorage
  const configuredBackendUrl = typeof window !== 'undefined' 
    ? localStorage.getItem('apiEndpoint') 
    : null
  const headers = new Headers(options.headers)
  if (configuredBackendUrl) headers.set('x-backend-url', configuredBackendUrl)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Utility function for backend API routes to fetch from the actual backend
 * with proper error handling and URL resolution.
 * 
 * This function is used by Next.js API routes to proxy requests to the actual
 * backend service. It handles URL construction, authentication, and error handling.
 * 
 * @param request - The incoming Next.js Request object
 * @param endpoint - The backend endpoint to call (e.g., '/api/plans')
 * @param options - Additional fetch options (method, body, etc.)
 * @param accessToken - Optional JWT token for authenticated requests
 * @returns Promise that resolves to the parsed JSON response from the backend
 * @throws Error if the backend request fails or returns an error status
 */
export async function fetchFromBackend(
  request: Request, 
  endpoint: string, 
  options: RequestInit = {},
  accessToken?: string
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
      method: options.method ? options.method : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      ...options,
    })

    if (!response.ok) {
      // For 401/403, return parsed body so caller can surface permission info
      if (response.status === 401 || response.status === 403) {
        try {
          const body = await response.json()
          return { status: response.status, ...body }
        } catch {
          const text = await response.text()
          return { status: response.status, error: `Backend request failed with status: ${response.status}`, details: text }
        }
      }
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
 * Utility function for making POST requests to the backend from Next.js API routes.
 * 
 * Similar to fetchFromBackend but specifically for POST requests with automatic
 * method setting and response handling.
 * 
 * @param request - The incoming Next.js Request object
 * @param endpoint - The backend endpoint to call (e.g., '/api/admin/plans')
 * @param options - Additional fetch options (body, headers, etc.)
 * @param accessToken - Optional JWT token for authenticated requests
 * @returns Promise that resolves to the Response object from the backend
 * @throws Error if the backend request fails or returns an error status
 */
export async function postFetchFromBackend(
  request: Request,
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      ...options,
    })

    if (!response.ok) {
      // For 401/403, return parsed body so caller can surface permission info
      if (response.status === 401 || response.status === 403) {
        try {
          const body = await response.json()
          return new Response(JSON.stringify(body), { status: response.status }) as unknown as Response
        } catch {
          const text = await response.text()
          return new Response(JSON.stringify({ error: `Backend request failed with status: ${response.status}`, details: text }), { status: response.status }) as unknown as Response
        }
      }
      throw new Error(`Backend request failed with status: ${response.status}`)
    }

    return response
  } catch (error) {
    console.error(`Error fetching from backend ${endpoint}:`, error)
    throw error
  }
}

/**
 * Handle backend error responses and extract permission information.
 * 
 * This function provides consistent error handling for backend API responses,
 * with special handling for authentication, authorization, and not found errors.
 * It extracts permission information from 403 responses to help users understand
 * what permissions they need.
 * 
 * @param response - The fetch Response object from the backend
 * @param endpoint - The endpoint being accessed (for fallback messages)
 * @returns Formatted error response object with error details and status
 */
export async function handleBackendError(response: Response, endpoint: string) {
  if (response.status === 401) {
    // Try to parse body for permission info (from AuthenticationEntryPoint)
    try {
      const errorResponse = await response.json()
      return {
        error: errorResponse.error || 'Authentication failed',
        details: errorResponse.details || 'Invalid or expired JWT token. Please login again.',
        requiredPermission: errorResponse.requiredPermission,
        currentPermissions: errorResponse.currentPermissions,
        missingPermissions: errorResponse.missingPermissions,
        status: response.status
      }
    } catch {
      return {
        error: 'Authentication failed',
        details: 'Invalid or expired JWT token. Please login again.',
        status: response.status
      }
    }
  } else if (response.status === 403) {
    // Try to get permission info from the backend error response
    try {
      const errorResponse = await response.json()
      const requiredPermission = errorResponse.requiredPermission || 'unknown'
      return {
        error: 'Access denied',
        details: `You do not have permission to access this resource. Required: ${requiredPermission}`,
        requiredPermission: errorResponse.requiredPermission,
        currentPermissions: errorResponse.currentPermissions,
        missingPermissions: errorResponse.missingPermissions,
        status: response.status
      }
    } catch (parseError) {
      // Fallback if we can't parse the error response
      return {
        error: 'Access denied',
        details: 'You do not have permission to access this resource',
        status: response.status
      }
    }
  } else if (response.status === 404) {
    // Handle 404 errors with more context
    try {
      const errorResponse = await response.json()
      return {
        error: 'Resource not found',
        details: errorResponse.message || 'The requested resource was not found',
        status: response.status
      }
    } catch (parseError) {
      return {
        error: 'Resource not found',
        details: 'The requested resource was not found',
        status: response.status
      }
    }
  } else {
    const errorText = await response.text()
    return {
      error: `Backend request failed`,
      details: errorText || 'Unknown error occurred',
      status: response.status
    }
  }
}

/**
 * Build query parameters from an object, excluding undefined/empty values.
 * 
 * This utility function helps construct URL query strings from parameter objects,
 * automatically filtering out undefined, null, or empty string values.
 * 
 * @param params - Object containing key-value pairs for query parameters
 * @returns URLSearchParams object ready for use in URLs
 */
export function buildQueryParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === null) {
      return
    }

    searchParams.append(key, value.toString())
  })
  
  return searchParams
}
