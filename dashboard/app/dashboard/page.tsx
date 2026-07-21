"use client"

import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0'
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Boxes, Layers, ArrowRight, Crosshair, Lock,
} from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useHasPermission } from "@/hooks/use-has-permission"
import { PERMISSIONS } from "@/constants/permissions"
import type { SystemMetrics } from "@/types/metrics"
import type { FlipOpportunity, PagedResponse } from "@/types/strategies"
import { OpportunityFeed } from './_components/opportunity-feed'

export default function Dashboard() {
  const { user } = useUser()
  const firstName = user?.name?.split(' ')[0] ?? 'Trader'

  const { data: metrics } = useBackendQuery<SystemMetrics>(
    '/api/metrics',
    { refetchInterval: 30000, queryKey: ['metrics'], requireAuth: false }
  )

  // Tiered access: only fetch/show the flips feed if this account owns the tool,
  // otherwise we'd leak premium data to lower tiers.
  const { hasPermission: canFlip, loading: permLoading } = useHasPermission(PERMISSIONS.USE_BAZAAR_FLIPPING)

  const { data: flips, isLoading: flipsLoading } = useBackendQuery<PagedResponse<FlipOpportunity>>(
    '/api/strategies/flipping?sort=score&limit=6&horizonHours=1',
    { refetchInterval: 60000, queryKey: ['top-flips'], requireAuth: true, enabled: canFlip }
  )
  const topFlips = flips?.items ?? []

  const lastFetch = metrics?.lastFetch ? new Date(metrics.lastFetch) : null
  const updated = lastFetch ? lastFetch.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Greeting: words on the canvas, then what the system knows right now */}
      <section className="space-y-6 pt-2">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hi, {firstName}.
          </h1>
          <p className="text-muted-foreground">
            Here's the market right now. Ready to spot your next flip?
          </p>
        </div>

        {/* Stat tiles: big tabular numbers, small labels */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border/60 md:grid-cols-4">
          <StatTile label="Items tracked" value={metrics ? metrics.totalItems.toLocaleString('en-US') : null} />
          <StatTile label="Profitable now" value={metrics ? metrics.profitableItems.toLocaleString('en-US') : null} />
          <StatTile label="Avg margin" value={metrics ? `${metrics.avgProfitMargin.toFixed(1)}%` : null} />
          <StatTile label="Last update" value={updated} live={!!updated} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/strategies/flipping"><TrendingUp className="h-4 w-4" />Find flips</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/bazaar-items"><Boxes className="h-4 w-4" />Browse market</Link>
          </Button>
        </div>
      </section>

      {/* Top flips right now, gated by the flipping tool */}
      {canFlip || permLoading ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Top flips right now</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gain" />
                  Live
                </span>
                {updated && <span className="text-muted-foreground/70">updated {updated}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/strategies/flipping">Open Flipping <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
          <OpportunityFeed items={topFlips} isLoading={flipsLoading || permLoading} />
        </section>
      ) : (
        <section className="rounded-xl border bg-card p-8">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Unlock Bazaar Flipping</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The top flips ranked by profit per hour, with budget sizing, risk
              flags and fill-time estimates.
            </p>
            <Button asChild className="mt-1">
              <Link href="/dashboard/profile">Upgrade <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* Explore */}
      <section className="grid gap-4 sm:grid-cols-3">
        <ExploreLink href="/dashboard/strategies/manipulation" icon={Crosshair}
          title="Manipulation" subtitle="Corner thin markets" />
        <ExploreLink href="/dashboard/bazaar-items" icon={Boxes}
          title="Bazaar Items" subtitle="Every live price" />
        <ExploreLink href="/dashboard/skyblock-items" icon={Layers}
          title="Item Catalog" subtitle="Browse all items" />
      </section>
    </div>
  )
}

/* Big mono number, small label. Reserves the number's line so tiles never jump
   between loading and loaded. */
function StatTile({ label, value, live }: { label: string; value: string | null; live?: boolean }) {
  return (
    <div className="bg-card p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">{label}</div>
      <div className="mt-1.5 flex h-8 items-center gap-2">
        {value === null ? (
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <span className="font-mono text-2xl font-bold leading-none tracking-tight">{value}</span>
            {live && <span className="h-1.5 w-1.5 rounded-full bg-gain" />}
          </>
        )}
      </div>
    </div>
  )
}

function ExploreLink({
  href, icon: Icon, title, subtitle,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-xl border bg-card p-4 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}
