"use client"

import { useBackendHealthContext } from '@/components/backend-health-provider'

/**
 * Hook to guard against API calls when backend is offline
 * Returns a function that throws an error if backend is offline
 */
export function useOfflineGuard() {
  const { isOnline, isIgnored } = useBackendHealthContext()

  const guard = () => {
    if (!isOnline && !isIgnored) {
      throw new Error('Backend is offline. Please wait for the service to come back online.')
    }
  }

  return {
    guard,
    isOnline,
    isIgnored
  }
}

/**
 * Hook to conditionally disable components when backend is offline
 */
export function useOfflineDisabled() {
  const { isOnline, isIgnored } = useBackendHealthContext()

  return {
    disabled: !isOnline && !isIgnored,
    isOnline,
    isIgnored,
    offlineMessage: 'Backend is offline'
  }
}
