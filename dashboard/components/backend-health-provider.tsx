"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useBackendHealth } from '@/hooks/use-backend-health'

interface BackendHealthContextType {
  isOnline: boolean
  isLoading: boolean
  error: string | null
  lastCheck: Date | null
  refreshHealth: () => void
}

const BackendHealthContext = createContext<BackendHealthContextType | undefined>(undefined)

export function BackendHealthProvider({ children }: { children: ReactNode }) {
  const health = useBackendHealth()

  return (
    <BackendHealthContext.Provider value={health}>
      {children}
    </BackendHealthContext.Provider>
  )
}

export function useBackendHealthContext() {
  const context = useContext(BackendHealthContext)
  if (context === undefined) {
    throw new Error('useBackendHealthContext must be used within a BackendHealthProvider')
  }
  return context
}
