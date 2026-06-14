"use client"

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import { useOfflineGuard } from './use-offline-guard'

/**
 * Ensures a freshly-logged-in user is provisioned (free plan) exactly once.
 *
 * nextjs-auth0 v4 keeps the session and access token server-side and refreshes
 * tokens automatically, so the old SPA token-refresh dance is gone: we simply
 * POST /api/me/setup once per user. The proxy route attaches the access token
 * from the session, so no client-side token handling is needed.
 */
export function useUserSetup() {
  const { user } = useUser()
  const { guard } = useOfflineGuard()
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const attemptedForUser = useRef<string | null>(null)

  useEffect(() => {
    const sub = user?.sub
    if (!sub) return
    if (attemptedForUser.current === sub) return
    attemptedForUser.current = sub

    const ensureSetup = async () => {
      try {
        guard()
        setIsSettingUp(true)
        // Idempotent on the backend: returns OK for existing users too.
        const response = await fetch('/api/me/setup', { method: 'POST' })
        setIsSetupComplete(response.ok)
        if (!response.ok) attemptedForUser.current = null // allow a retry next mount
      } catch (err) {
        // Backend offline (guard throws) or network error: retry on next session.
        attemptedForUser.current = null
        setIsSetupComplete(false)
      } finally {
        setIsSettingUp(false)
      }
    }

    ensureSetup()
  }, [user?.sub, guard])

  return {
    isSetupComplete,
    isSettingUp,
    isRefreshingToken: false,
    needsSetup: !!user && !isSetupComplete,
    refreshToken: async () => {},
  }
}
