"use client"

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, TrendingUp, Activity, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandMark } from '@/components/brand-mark'
import { SiteFooter } from '@/components/site-footer'
import { useBackendQuery } from '@/hooks/use-backend-query'
import type { BazaarItemLiveView, BazaarItemsResponse } from '@/types/bazaar'

const compact = (n: number) => {
  if (!Number.isFinite(n)) return '–'
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return Math.round(n).toLocaleString('en-US')
}

/** Readable fallback for items the catalog has no display name for. */
const prettyName = (i: { displayName?: string; productId: string }) =>
  i.displayName ||
  i.productId.replace(/^ENCHANTMENT_/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * Market Pulse: a public, no-account snapshot of the bazaar right now. It
 * exists to be linked, shared and indexed; the paid product turns these raw
 * movers into ranked, sized plays.
 */
export default function PulsePage() {
  const { data, isLoading, isError, refetch, isFetching } = useBackendQuery<BazaarItemsResponse>(
    '/api/bazaar/items?limit=200',
    { requireAuth: false, refetchInterval: 60_000, queryKey: ['pulse'] }
  )

  const { spreads, traded, contested } = useMemo(() => {
    const items = (data?.items ?? []).filter((i: BazaarItemLiveView) => i.snapshot)
    const s = (i: BazaarItemLiveView) => i.snapshot!
    const spreadPct = (i: BazaarItemLiveView) => {
      const buy = s(i).instantBuyPrice
      return buy > 0 ? (buy - s(i).instantSellPrice) / buy : 0
    }
    return {
      spreads: [...items]
        // Junk guard: a one-sided book reads as a "100% spread"; require a live
        // sell side and real volume so the list shows tradable gaps, not ghosts.
        .filter((i) =>
          s(i).instantBuyPrice > 100 &&
          s(i).instantSellPrice > 0 &&
          spreadPct(i) < 0.9 &&
          (s(i).buyMovingWeek + s(i).sellMovingWeek) > 10_000)
        .sort((a, b) => spreadPct(b) - spreadPct(a))
        .slice(0, 8),
      traded: [...items]
        .sort((a, b) => (s(b).buyMovingWeek + s(b).sellMovingWeek) - (s(a).buyMovingWeek + s(a).sellMovingWeek))
        .slice(0, 8),
      contested: [...items]
        .sort((a, b) => (s(b).activeBuyOrdersCount + s(b).activeSellOrdersCount) - (s(a).activeBuyOrdersCount + s(a).activeSellOrdersCount))
        .slice(0, 8),
    }
  }, [data])

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8 rounded-lg" />
            <span className="text-[17px] font-semibold tracking-tight">Modern Bazaar</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard/bazaar-items">All items</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <header className="mb-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Market Pulse</h1>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-gain" />
              Live
            </span>
          </div>
          <p className="max-w-xl text-muted-foreground">
            The Hypixel SkyBlock bazaar right now, refreshed every minute. No
            account needed.
          </p>
        </header>

        {isError ? (
          <div role="alert" className="mb-8 flex flex-col gap-4 border border-loss/30 bg-loss/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-loss" />
              <div>
                <p className="font-semibold">Live market data is temporarily unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The market API did not respond successfully. No empty or stale ranking is being shown.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-3">
          <PulseCard
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            title="Widest spreads"
            hint="Buy low, sell high gaps"
            loading={isLoading}
            unavailable={isError}
            rows={spreads.map((i) => ({
              id: i.snapshot!.productId,
              name: prettyName(i.snapshot!),
              value: `${Math.round(((i.snapshot!.instantBuyPrice - i.snapshot!.instantSellPrice) / i.snapshot!.instantBuyPrice) * 100)}%`,
            }))}
          />
          <PulseCard
            icon={<Activity className="h-4 w-4 text-primary" />}
            title="Most traded"
            hint="Weekly volume, both sides"
            loading={isLoading}
            unavailable={isError}
            rows={traded.map((i) => ({
              id: i.snapshot!.productId,
              name: prettyName(i.snapshot!),
              value: compact(i.snapshot!.buyMovingWeek + i.snapshot!.sellMovingWeek),
            }))}
          />
          <PulseCard
            icon={<Users className="h-4 w-4 text-primary" />}
            title="Busiest order books"
            hint="Active buy + sell orders"
            loading={isLoading}
            unavailable={isError}
            rows={contested.map((i) => ({
              id: i.snapshot!.productId,
              name: prettyName(i.snapshot!),
              value: compact(i.snapshot!.activeBuyOrdersCount + i.snapshot!.activeSellOrdersCount),
            }))}
          />
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold tracking-tight">These are the raw movers.</h2>
            <p className="text-sm text-muted-foreground">
              The dashboard turns them into ranked plays, sized to your coins,
              with risk flags and fill times.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/dashboard">
              Open the dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function PulseCard({ icon, title, hint, rows, loading, unavailable }: {
  icon: React.ReactNode
  title: string
  hint: string
  rows: { id: string; name: string; value: string }[]
  loading: boolean
  unavailable: boolean
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : unavailable ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Unavailable</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No live market rows</p>
      ) : (
        <ol className="divide-y divide-border/50">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/bazaar-items/${r.id}`}
                className="group flex items-center gap-3 py-2 transition-colors hover:text-primary"
              >
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground/60">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                <span className="shrink-0 font-mono text-sm font-semibold">{r.value}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
