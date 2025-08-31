"use client"

import { useState, useEffect, useCallback } from 'react'

interface BackendHealth {
  isOnline: boolean
  lastCheck: Date | null
  error: string | null
  isLoading: boolean
}

/**
 * Hook to monitor backend health status
 * Checks backend health every 30 seconds and provides offline detection
 */
export function useBackendHealth() {
  const [health, setHealth] = useState<BackendHealth>({
    isOnline: true, // Start optimistic
    lastCheck: null,
    error: null,
    isLoading: false
  })

  const checkHealth = useCallback(async () => {
    try {
      setHealth(prev => ({ ...prev, isLoading: true, error: null }))
      
      console.log('🔍 Checking backend health via /api/health...')
      
      const response = await fetch('/api/health', {
        method: 'GET',
        // Short timeout to detect offline quickly
        signal: AbortSignal.timeout(5000),
        headers: {
          'Accept': 'application/json',
        }
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        console.log('✅ Backend is online')
        setHealth({
          isOnline: true,
          lastCheck: new Date(),
          error: null,
          isLoading: false
        })
      } else {
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('❌ Backend health check failed:', errorMessage)
      setHealth({
        isOnline: false,
        lastCheck: new Date(),
        error: errorMessage,
        isLoading: false
      })
    }
  }, [])

  useEffect(() => {
    // Initial health check
    checkHealth()

    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkHealth, 30000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [checkHealth])

  // Manual health check function for immediate status updates
  const refreshHealth = useCallback(() => {
    checkHealth()
  }, [checkHealth])

  return {
    ...health,
    refreshHealth
  }
}
