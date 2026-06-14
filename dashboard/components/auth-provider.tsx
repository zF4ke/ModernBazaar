"use client"

import { Auth0Provider } from '@auth0/nextjs-auth0'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Client provider for nextjs-auth0 v4. Exposes the session user to `useUser()`.
 * All Auth0 configuration lives server-side in lib/auth0.ts; the browser only
 * ever sees the (non-sensitive) user profile via /auth/profile.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return <Auth0Provider>{children}</Auth0Provider>
}
