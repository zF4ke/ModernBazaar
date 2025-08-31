"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'

export default function RootPage() {
  const router = useRouter()
  const { handleRedirectCallback } = useAuth0()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const hasAuthParams = params.has('code') && params.has('state')
    const inIframe = window.self !== window.top
    
    // If inside silent-auth iframe, never redirect
    if (inIframe) return

    if (hasAuthParams) {
      // Handle the redirect callback first - this is CRITICAL for refresh tokens
      handleRedirectCallback()
        .then((appState) => {
          // Navigate to the intended destination
          const returnTo = (appState as any)?.returnTo || '/dashboard'
          router.replace(returnTo)
        })
        .catch((error: any) => {
          console.error('Failed to handle Auth0 redirect callback on main page:', error)
          // On error, still try to navigate to dashboard
          router.replace('/dashboard')
        })
      return
    }

    router.replace('/dashboard')
  }, [router, handleRedirectCallback])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
