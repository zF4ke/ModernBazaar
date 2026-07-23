"use client"

import { useBackendHealthContext } from '@/components/backend-health-provider'
import { Button } from '@/components/ui/button'
import { RefreshCw, WifiOff, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Full-screen takeover when the backend is unreachable. Dashboard routes only:
 * the landing and legal pages are static marketing surfaces and must never be
 * blocked by backend status (the footer dot already tells that story there).
 */
export function OfflineOverlay() {
  const { isOnline, isLoading, error, lastCheck, isIgnored, refreshHealth, ignoreOffline } = useBackendHealthContext()
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard') ?? false

  const active = isDashboard && !isOnline && !isIgnored

  // Freeze scrolling while the takeover is up.
  useEffect(() => {
    if (active) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [active])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background/60 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="animate-rise-in mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border bg-card px-7 py-8 text-center shadow-[0_24px_60px_-24px_hsl(230_60%_3%/0.9)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-loss/10">
            <WifiOff className="h-5 w-5 text-loss" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Connection lost</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We can't reach the market data service. It usually comes back within
            a minute; we keep retrying in the background.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={refreshHealth} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Checking' : 'Retry now'}
            </Button>
            <Button onClick={ignoreOffline} variant="ghost">
              <X className="h-4 w-4" />
              Dismiss
            </Button>
          </div>
          {lastCheck && (
            <p className="mt-2 text-xs text-muted-foreground/70">
              Last check <span className="font-mono">{lastCheck.toLocaleTimeString()}</span>
              {error ? '. Features stay limited until the connection returns.' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
