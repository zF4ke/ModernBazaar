"use client"

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import { useBackendHealthContext } from '@/components/backend-health-provider'

const MAX_ATTEMPTS = 3

/**
 * Ensures a freshly-logged-in user is provisioned (free plan) exactly once.
 *
 * nextjs-auth0 v4 keeps the session and access token server-side and refreshes
 * tokens automatically, so the old SPA token-refresh dance is gone: we simply
 * POST /api/me/setup once per user. The proxy route attaches the access token
 * from the session, so no client-side token handling is needed.
 *
 * Robustness: we depend only on the backend-health booleans (not on an unstable
 * `guard` function) and mark the attempt BEFORE awaiting, so a failing request
 * can never re-arm itself into a retry storm. Auth failures (401/403) are not
 * retried — only transient 5xx / network errors, and only up to MAX_ATTEMPTS.
 */
export function useUserSetup() {
  const { user } = useUser()
  const { isOnline, isIgnored } = useBackendHealthContext()
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const attemptedForUser = useRef<string | null>(null)
  const attempts = useRef(0)

  useEffect(() => {
    const sub = user?.sub
    if (!sub) return
    if (attemptedForUser.current === sub) return
    if (attempts.current >= MAX_ATTEMPTS) return
    // Backend known-offline: skip for now; the effect re-runs when it comes online.
    if (!isOnline && !isIgnored) return

    // Mark attempted BEFORE awaiting so re-renders cannot re-fire the request.
    attemptedForUser.current = sub
    attempts.current += 1
    let cancelled = false

    const ensureSetup = async () => {
      try {
        setIsSettingUp(true)
        // Idempotent on the backend: returns OK for existing users too.
        const response = await fetch('/api/me/setup', { method: 'POST' })
        if (cancelled) return
        setIsSetupComplete(response.ok)
        // Re-arm ONLY for a transient server error. Auth failures (401/403) will
        // not be fixed by retrying, so we leave the user marked as attempted.
        if (response.status >= 500) attemptedForUser.current = null
      } catch {
        if (cancelled) return
        // Network error: allow a retry on the next online transition / mount.
        attemptedForUser.current = null
        setIsSetupComplete(false)
      } finally {
        if (!cancelled) setIsSettingUp(false)
      }
    }

    ensureSetup()
    return () => { cancelled = true }
  }, [user?.sub, isOnline, isIgnored])

  return {
    isSetupComplete,
    isSettingUp,
    isRefreshingToken: false,
    needsSetup: !!user && !isSetupComplete,
    refreshToken: async () => {},
  }
}
