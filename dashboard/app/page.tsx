"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const hasAuthParams = params.has('code') && params.has('state')
    const inIframe = window.self !== window.top
    // If inside silent-auth iframe, never redirect
    if (inIframe) return

    if (hasAuthParams) {
      // Wait for Auth0 SDK to clear callback params, then navigate
      let attempts = 0
      const maxAttempts = 50 // ~5s
      const id = window.setInterval(() => {
        attempts++
        const sp = new URLSearchParams(window.location.search)
        const cleared = !sp.has('code') && !sp.has('state')
        if (cleared || attempts >= maxAttempts) {
          window.clearInterval(id)
          router.replace('/dashboard')
        }
      }, 100)
      return () => window.clearInterval(id)
    }

    router.replace('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
