"use client"

import { useBackendHealthContext } from '@/components/backend-health-provider'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Offline overlay that locks down the entire dashboard when backend is offline
 * This component should be placed at the top level of the dashboard layout
 */
export function OfflineOverlay() {
  const { isOnline, isLoading, error, lastCheck, refreshHealth } = useBackendHealthContext()

  // Disable page scrolling when backend is offline
  useEffect(() => {
    if (!isOnline) {
      // Disable scrolling
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      // Re-enable scrolling
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }

    // Cleanup: re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [isOnline])

  // Don't show anything if backend is online
  if (isOnline) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm overflow-hidden">
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="mx-auto max-w-md text-center p-8 rounded-2xl bg-background backdrop-blur-sm border border-border/70 shadow-xl animate-in fade-in-0 zoom-in-95 duration-300">
          {/* Offline Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-10 w-10 text-red-700" />
          </div>

          {/* Title */}
          <h1 className="mb-4 text-2xl font-bold text-red-700">
            Backend Offline
          </h1>

          {/* Error Details */}
          <div className="mb-6 space-y-2 text-muted-foreground">
            <p>
              The Modern Bazaar backend service is currently unavailable.
            </p>
            {error && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <code className="text-xs">{error}</code>
              </div>
            )}
            {lastCheck && (
              <p className="text-xs">
                Last check: {lastCheck.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <Button 
              onClick={refreshHealth} 
              disabled={isLoading}
              className="flex items-center gap-2 `shadow`-sm"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isLoading ? 'Checking...' : 'Refresh Status'}
            </Button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 rounded-lg border border-border/20 bg-muted/20 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">What this means:</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• All dashboard features are temporarily disabled</li>
                  <li>• Data cannot be loaded or saved</li>
                  <li>• Authentication may not work properly</li>
                  <li>• Please wait for the service to come back online</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
