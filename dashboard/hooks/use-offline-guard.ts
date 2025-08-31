"use client"

import { useBackendHealthContext } from '@/components/backend-health-provider'

/**
 * Hook to guard against API calls when backend is offline
 * Returns a function that throws an error if backend is offline
 */
export function useOfflineGuard() {
  const { isOnline } = useBackendHealthContext()

  const guard = () => {
    if (!isOnline) {
      throw new Error('Backend is offline. Please wait for the service to come back online.')
    }
  }

  return {
    guard,
    isOnline
  }
}

/**
 * Hook to conditionally disable components when backend is offline
 */
export function useOfflineDisabled() {
  const { isOnline } = useBackendHealthContext()

  return {
    disabled: !isOnline,
    isOnline,
    offlineMessage: 'Backend is offline'
  }
}
