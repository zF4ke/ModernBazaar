"use client"

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth0 } from '@auth0/auth0-react'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useAuth0()

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

    // Primary path: when SDK finishes processing, navigate away
    if (!isLoading) {
      window.location.replace(target)
      return
    }

    // Secondary path: poll for URL cleanup (SDK typically clears code/state)
    let attempts = 0
    const id = window.setInterval(() => {
      attempts++
      const sp = new URLSearchParams(window.location.search)
      const cleared = !sp.has('code') && !sp.has('state')
      if (cleared) {
        window.clearInterval(id)
        window.location.replace(target)
      } else if (attempts >= 80) { // ~20s failsafe
        window.clearInterval(id)
        // As a last resort, do nothing else; staying preserves the URL for SDK
      }
    }, 250)

    return () => window.clearInterval(id)
  }, [inIframe, isLoading])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  )
}
