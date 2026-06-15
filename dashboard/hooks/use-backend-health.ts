"use client"

import { useState, useEffect, useCallback, useRef } from 'react'

interface BackendHealth {
  isOnline: boolean
  lastCheck: Date | null
  error: string | null
  isLoading: boolean
  isIgnored: boolean
}

// Ride out transient blips (e.g. a backend reload on localhost): only declare the
// backend offline after this many consecutive failed probes.
const FAILURE_THRESHOLD = 2
// Poll calmly while healthy, but probe aggressively after a failure so recovery
// (and the offline overlay clearing) feels near-instant.
const HEALTHY_INTERVAL = 30_000
const DEGRADED_INTERVAL = 5_000

/**
 * Monitors backend health for offline detection.
 *
 * Starts optimistic (online) and is tolerant of single failed probes so a brief
 * blip never flashes the full-screen offline overlay. When a probe does fail it
 * re-checks quickly, so coming back online is fast.
 */
export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealth>({
    isOnline: true, // Start optimistic
    lastCheck: null,
    error: null,
    isLoading: false,
    isIgnored: false,
  })

  // Consecutive failure counter lives in a ref so it never triggers re-renders.
  const failuresRef = useRef(0)

  const checkHealth = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading) setHealth((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        // Short timeout so a hung backend is detected quickly.
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) throw new Error(`Backend responded with status: ${response.status}`)

      failuresRef.current = 0
      // Bail out of the state update when nothing changed, to avoid a re-render
      // on every healthy poll.
      setHealth((prev) =>
        prev.isOnline && !prev.isLoading && prev.error === null
          ? prev
          : { isOnline: true, lastCheck: new Date(), error: null, isLoading: false, isIgnored: false },
      )
    } catch (error) {
      failuresRef.current += 1
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Only flip to offline once we've seen enough consecutive failures.
      if (failuresRef.current >= FAILURE_THRESHOLD) {
        setHealth((prev) => ({
          isOnline: false,
          lastCheck: new Date(),
          error: errorMessage,
          isLoading: false,
          isIgnored: prev.isIgnored, // Keep ignore state when offline
        }))
      } else {
        // First failure: stay online, just clear any loading flag.
        setHealth((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev))
      }
    }
  }, [])

  // Self-scheduling poll: fast cadence while degraded/offline, calm while healthy.
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>

    const loop = async () => {
      await checkHealth()
      if (!active) return
      const delay = failuresRef.current > 0 ? DEGRADED_INTERVAL : HEALTHY_INTERVAL
      timer = setTimeout(loop, delay)
    }

    loop()

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [checkHealth])

  const refreshHealth = useCallback(() => {
    checkHealth({ showLoading: true })
  }, [checkHealth])

  const ignoreOffline = useCallback(() => {
    setHealth((prev) => ({ ...prev, isIgnored: true }))
  }, [])

  const stopIgnoring = useCallback(() => {
    setHealth((prev) => ({ ...prev, isIgnored: false }))
  }, [])

  return {
    ...health,
    refreshHealth,
    ignoreOffline,
    stopIgnoring,
  }
}
