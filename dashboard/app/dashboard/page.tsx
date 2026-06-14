"use client"

import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { MarketInsightCard } from "@/components/market-trend-chart"
import {
  TrendingUp, Boxes, Layers, Sparkles, DollarSign, Target, Activity, ArrowRight, Shuffle, Crosshair,
} from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { SystemMetrics } from "@/types/metrics"
import type { BazaarItemsResponse } from "@/types/bazaar"
import { FeatureCard } from '@/components/feature-card'
import { GradientSection } from '@/components/gradient-section'

const formatNumber = (value: number) => value.toLocaleString('en-US')

/** Compact coin formatting for large numbers (e.g. 3.47M, 1.2B). */
const formatCompact = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  return Math.round(value).toLocaleString('en-US')
}

const ROADMAP = ["Craft Flipping", "NPC Flipping", "Budget Planner", "Auction House"]

export default function Dashboard() {
  const { user } = useUser()
  const firstName = user?.name?.split(' ')[0] ?? 'Trader'

  const { data: metrics, isLoading: metricsLoading } = useBackendQuery<SystemMetrics>(
    '/api/metrics',
    { refetchInterval: 30000, queryKey: ['metrics'], requireAuth: false }
  )

  const { data: bazaarItemsData, isLoading: bazaarItemsLoading } = useBackendQuery<BazaarItemsResponse>(
    '/api/bazaar/items?limit=10&sort=spreaddesc',
    { refetchInterval: 300000, queryKey: ['market-insights'], requireAuth: true }
  )

  const lastFetch = metrics?.lastFetch ? new Date(metrics.lastFetch) : null
  const lastFetchLabel = lastFetch
    ? lastFetch.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <GradientSection variant="hero" padding="md" backdropBlur="none">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Welcome back
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hi, {firstName}. Ready to spot your next Bazaar flip?
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Watch Hypixel SkyBlock prices, find reliable buy/sell gaps, and flip items with confidence.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/dashboard/strategies/flipping"><TrendingUp className="h-4 w-4" />Find Flips</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/bazaar-items"><Boxes className="h-4 w-4" />Browse Market</Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/skyblock-items"><Layers className="h-4 w-4" />Item Catalog</Link>
            </Button>
          </div>
        </div>
      </GradientSection>

      {/* Market snapshot */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-semibold">Market snapshot</h2>
          {lastFetchLabel && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Updated {lastFetchLabel}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-16" /></div>
                </div>
              </CardContent></Card>
            ))
          ) : (
            <>
              <StatusCard title="Tracked items" icon={Boxes} value={formatNumber(metrics?.totalItems || 0)}
                iconColorClass="text-blue-400" bgColorClass="bg-blue-500/15" />
              <StatusCard title="Profitable now" icon={Target} value={formatNumber(metrics?.profitableItems || 0)}
                iconColorClass="text-emerald-400" bgColorClass="bg-emerald-500/15" />
              <StatusCard title="Avg. spread" icon={DollarSign} value={`${formatCompact(metrics?.avgProfitMargin)}`}
                iconColorClass="text-amber-400" bgColorClass="bg-amber-500/15" />
              <StatusCard title="Market activity" icon={Activity} value={`${Math.round(metrics?.marketActivityScore || 0)}/100`}
                iconColorClass="text-violet-400" bgColorClass="bg-violet-500/15" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bazaarItemsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-24" /></div>
                  <Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32" />
                </div>
              </CardContent></Card>
            ))
          ) : bazaarItemsData ? (
            <>
              <MarketInsightCard title="Order flow" description="Average active orders across top items" metric="activity" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
              <MarketInsightCard title="Price volatility" description="Spread spread across the most active items" metric="volatility" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
              <MarketInsightCard title="Top opportunities" description="Items with the widest profitable gaps" metric="opportunities" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
            </>
          ) : null}
        </div>
      </section>

      {/* Your tools */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Your tools</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/strategies">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ToolCard
            icon={Shuffle} accent="text-emerald-400" tint="bg-emerald-500/15" glow="bg-emerald-500/30"
            title="Bazaar Flipping"
            description="Find buy/sell gaps worth taking, ranked by profit per hour after tax, with risk flags and fill-time estimates."
            href="/dashboard/strategies/flipping"
          />
          <ToolCard
            icon={Crosshair} accent="text-blue-400" tint="bg-blue-500/15" glow="bg-blue-500/30"
            title="Bazaar Manipulation"
            description="Find thin markets you can corner within budget, with the full plan: cost to corner, break-even after tax, and sell-through time."
            href="/dashboard/strategies/manipulation"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          More tools in progress: {ROADMAP.join(" · ")}.{" "}
          <Link href="/dashboard/strategies" className="text-foreground/80 hover:text-foreground underline underline-offset-2">See the roadmap</Link>
        </p>
      </section>
    </div>
  )
}

function ToolCard({
  icon: Icon, accent, tint, glow, title, description, href,
}: {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  tint: string
  glow: string
  title: string
  description: string
  href: string
}) {
  return (
    <FeatureCard backgroundStyle="glass" glow={glow}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
          <Icon className={`h-[22px] w-[22px] ${accent}`} />
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5 flex-1 leading-relaxed">{description}</p>
      <Button asChild className="mt-auto w-fit">
        <Link href={href}>Open <ArrowRight className="h-4 w-4 ml-1" /></Link>
      </Button>
    </FeatureCard>
  )
}
