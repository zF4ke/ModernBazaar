"use client"

import { Auth0Provider } from '@auth0/auth0-react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE
  const redirectUri = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI

  if (!domain || !clientId || !audience || !redirectUri) {
    throw new Error(
      'Missing required Auth0 environment variables. Please set NEXT_PUBLIC_AUTH0_DOMAIN, NEXT_PUBLIC_AUTH0_CLIENT_ID, NEXT_PUBLIC_AUTH0_AUDIENCE, and NEXT_PUBLIC_AUTH0_REDIRECT_URI.'
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
        // Handle redirect callback
        if (appState?.returnTo) {
          window.history.replaceState(
            {},
            document.title,
            appState.returnTo
          )
        } else {
          // If no returnTo, clear URL parameters after successful auth
          const urlParams = new URLSearchParams(window.location.search)
          const code = urlParams.get('code')
          const state = urlParams.get('state')
          
          if (code && state) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        }
      }}
    >
      {children}
    </Auth0Provider>
  )
}
