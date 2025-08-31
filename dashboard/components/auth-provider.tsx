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
        audience,
        redirect_uri: redirectUri,
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens
      useRefreshTokensFallback
      onRedirectCallback={(appState) => {
        // Skip navigation when running in the silent-auth iframe
        if (typeof window !== 'undefined' && window.self !== window.top) return
        const target = appState?.returnTo || '/dashboard'
        // Use full navigation to ensure route updates reliably on all hosts
        try {
          window.location.replace(target)
        } catch {
          // As a last resort
          window.location.href = target
        }
      }}
    >
      {children}
    </Auth0Provider>
  )
}
