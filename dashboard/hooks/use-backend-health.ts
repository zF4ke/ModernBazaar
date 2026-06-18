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
// Calm cadence while healthy.
const HEALTHY_INTERVAL = 60_000
// While failing, back off exponentially from this base up to the cap. This keeps
// recovery snappy (the first retry after a failure is quick) without spamming a
// long-down backend every few seconds: 5s → 10s → 20s → 40s → 60s (capped).
const DEGRADED_BASE = 5_000
const DEGRADED_MAX = 60_000

/** Next poll delay: calm while healthy, exponential backoff (capped) while failing. */
function nextDelay(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return HEALTHY_INTERVAL
  const backoff = DEGRADED_BASE * 2 ** (consecutiveFailures - 1)
  return Math.min(backoff, DEGRADED_MAX)
}

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

  // Self-scheduling poll: calm while healthy, exponential backoff while failing,
  // and paused entirely while the tab is hidden (resumes with an immediate check).
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>

    const isHidden = () => typeof document !== 'undefined' && document.hidden

    const schedule = () => {
      clearTimeout(timer)
      // Don't poll a backgrounded tab — no point, and it's the main source of spam.
      if (!active || isHidden()) return
      timer = setTimeout(loop, nextDelay(failuresRef.current))
    }

    const loop = async () => {
      if (!active) return
      await checkHealth()
      schedule()
    }

    const onVisibility = () => {
      if (isHidden()) {
        clearTimeout(timer) // pause
      } else {
        loop() // became visible: re-check immediately, then resume scheduling
      }
    }

    loop()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }

    return () => {
      active = false
      clearTimeout(timer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
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
