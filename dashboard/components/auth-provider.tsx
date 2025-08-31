"use client"

import { Auth0Provider } from '@auth0/auth0-react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE
  // Compute redirect URI at runtime so it matches current origin
  const redirectUri = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI

  if (!domain || !clientId || !audience) {
    throw new Error(
      'Missing required Auth0 environment variables. Please set NEXT_PUBLIC_AUTH0_DOMAIN, NEXT_PUBLIC_AUTH0_CLIENT_ID, and NEXT_PUBLIC_AUTH0_AUDIENCE.'
    )
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        audience: audience,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      useRefreshTokensFallback
      // We manually handle callbacks in pages; prevent double-handling here
      skipRedirectCallback
      // Force single audience configuration
      // Remove onRedirectCallback to avoid conflicts with manual handling
      // The callback pages will handle the redirect manually
    >
      {children}
    </Auth0Provider>
  )
}
