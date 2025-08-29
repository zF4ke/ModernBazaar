"use client"

import { Auth0Provider } from '@auth0/auth0-react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN || 'dev-5dw1c9bd.us.auth0.com'
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || 'fZ6gr0w2WK15rKHAWV8rFdjxuDabljND'
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || 'https://modern-bazaar.api'
  const redirectUri = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 'http://localhost:3001'

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        audience,
        redirect_uri: redirectUri
      }}
      cacheLocation="localstorage"
      useRefreshTokens
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
