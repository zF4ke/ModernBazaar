"use client"

import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0'
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Boxes, Layers, Sparkles, ArrowRight, Crosshair, Lock,
} from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useHasPermission } from "@/hooks/use-has-permission"
import { PERMISSIONS } from "@/constants/permissions"
import type { SystemMetrics } from "@/types/metrics"
import type { FlipOpportunity, PagedResponse } from "@/types/strategies"
import { GradientSection } from '@/components/gradient-section'
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

  const profitable = metrics?.profitableItems
  const lastFetch = metrics?.lastFetch ? new Date(metrics.lastFetch) : null
  const updated = lastFetch ? lastFetch.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <GradientSection variant="hero" padding="md" backdropBlur="none">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Welcome back
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hi, {firstName}. Here&apos;s what&apos;s worth flipping.
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {profitable !== undefined
              ? `${profitable.toLocaleString()} items are profitable right now.`
              : 'Live Hypixel Bazaar prices, scored for profit.'}{' '}
            Jump straight in, or browse the market yourself.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg">
              <Link href="/dashboard/strategies/flipping"><TrendingUp className="h-4 w-4" />Find Flips</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/strategies/manipulation"><Crosshair className="h-4 w-4" />Manipulation</Link>
            </Button>
          </div>
        </div>
      </GradientSection>

      {/* Top flips right now — gated by the flipping tool */}
      {canFlip || permLoading ? (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-semibold">Top flips right now</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
                {updated && <span>· updated {updated}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/strategies/flipping">Open Flipping <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
          <OpportunityFeed items={topFlips} isLoading={flipsLoading || permLoading} />
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-xl border bg-card p-8 text-center">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
              <Lock className="h-5 w-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold">Unlock Bazaar Flipping</h2>
            <p className="text-sm text-muted-foreground">
              See the top flips ranked by profit per hour, plus the full flipping toolkit with budget sizing, risk flags and fill-time estimates.
            </p>
            <Button asChild className="mt-1">
              <Link href="/dashboard/profile">Upgrade <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* Explore */}
      <section className="grid gap-4 sm:grid-cols-3">
        <ExploreLink href="/dashboard/strategies/manipulation" icon={Crosshair} accent="text-blue-400" tint="bg-blue-500/15"
          title="Manipulation" subtitle="Corner thin markets" />
        <ExploreLink href="/dashboard/bazaar-items" icon={Boxes} accent="text-violet-400" tint="bg-violet-500/15"
          title="Bazaar Items" subtitle="Every live price" />
        <ExploreLink href="/dashboard/skyblock-items" icon={Layers} accent="text-amber-400" tint="bg-amber-500/15"
          title="Item Catalog" subtitle="Browse all items" />
      </section>
    </div>
  )
}

function ExploreLink({
  href, icon: Icon, accent, tint, title, subtitle,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  tint: string
  title: string
  subtitle: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-border/80 hover:bg-muted/30"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tint}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  )
}
