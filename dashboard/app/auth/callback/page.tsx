"use client"

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated, handleRedirectCallback } = useAuth0()

  const inIframe = useMemo(() => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top
    } catch {
      return true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (inIframe) return // silent-auth iframe should not navigate

    const search = new URLSearchParams(window.location.search)
    const hasAuthParams = search.has('code') && search.has('state')
    const target = '/dashboard'

    // Handle the redirect callback first - this is CRITICAL for refresh tokens
    if (hasAuthParams) {
      // Add a small delay to ensure Auth0 SDK is ready
      setTimeout(() => {
        handleRedirectCallback()
          .then((appState) => {
            // Navigate to the intended destination
            const returnTo = (appState as any)?.returnTo || target
            window.location.replace(returnTo)
          })
          .catch((error: any) => {
            console.error('Failed to handle Auth0 redirect callback:', error)
            // On error, still try to navigate to dashboard
            window.location.replace(target)
          })
      }, 100)
      return
    }

    // If no auth params, just navigate to dashboard
    if (!isLoading) {
      window.location.replace(target)
    }
  }, [inIframe, isLoading, handleRedirectCallback])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  )
}
