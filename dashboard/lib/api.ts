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
/**
 * Server-only: get the current user's Auth0 access token from the session cookie
 * (nextjs-auth0 v4). Dynamically imported so the server-only auth client never
 * leaks into client bundles. Returns undefined when there is no session.
 */
async function getSessionAccessToken(): Promise<string | undefined> {
  try {
    const { auth0 } = await import("@/lib/auth0")
    const { token } = await auth0.getAccessToken()
    return token ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Resolve the backend base URL. SECURITY: never trust a client-sent x-backend-url
 * in production — the server attaches the user's access token to this request, so
 * honoring an attacker-controlled host would exfiltrate the token (SSRF). The
 * override is only allowed outside production for local dev convenience.
 */
function resolveBackendUrl(request: Request): string {
  const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080"
  if (process.env.NODE_ENV !== "production") {
    return (request.headers.get("x-backend-url") || DEFAULT_BACKEND_URL).replace(/\/+$/, "")
  }
  return DEFAULT_BACKEND_URL.replace(/\/+$/, "")
}

export async function fetchFromBackend(
  request: Request,
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const backendUrl = resolveBackendUrl(request)

  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  // Construct the full URL
  const fullUrl = `${backendUrl}${cleanEndpoint}`

  // Acquire the access token from the session if the caller didn't pass one.
  const token = accessToken ?? (await getSessionAccessToken())

  try {
    // Validate URL before making the request
    new URL(fullUrl) // This will throw if URL is invalid

    const response = await fetch(fullUrl, {
      method: options.method ? options.method : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...options,
    })

    if (!response.ok) {
      // Return the parsed error envelope (with status) for ALL backend errors so
      // callers can surface the real message — 401/403 permission info AND the
      // backend's GlobalExceptionHandler 500 body (which carries ex.getMessage()
      // in `details`). Read the body exactly once (an empty body would make a
      // second read throw).
      const text = await response.text()
      try {
        return { status: response.status, ...JSON.parse(text) }
      } catch {
        return { status: response.status, error: `Backend request failed with status: ${response.status}`, details: text }
      }
    }

    return await response.json()
  } catch (error) {
    // Don't log common expected errors
    const isExpectedError = error instanceof Error && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed') ||
      error.message.includes('Invalid URL') ||
      error.message.includes('Failed to parse URL') ||
      (error as any).status === 404 ||
      error.message.includes('404')
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
  const backendUrl = resolveBackendUrl(request)

  // Ensure endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  // Construct the full URL
  const fullUrl = `${backendUrl}${cleanEndpoint}`

  // Acquire the access token from the session if the caller didn't pass one.
  const token = accessToken ?? (await getSessionAccessToken())

  try {
    // Validate URL before making the request
    new URL(fullUrl) // This will throw if URL is invalid

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...options,
    })

    if (!response.ok) {
      // For 401/403, forward the body so the caller can surface permission info.
      // Read the body exactly once (an empty 401 body would make a second read throw).
      if (response.status === 401 || response.status === 403) {
        const text = await response.text()
        const payload = text || JSON.stringify({ error: `Backend request failed with status: ${response.status}` })
        return new Response(payload, { status: response.status, headers: { "content-type": "application/json" } })
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
        requiredPermissions: errorResponse.requiredPermissions,
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
        requiredPermissions: errorResponse.requiredPermissions,
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
