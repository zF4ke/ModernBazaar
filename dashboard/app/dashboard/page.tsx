"use client"

import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { MarketInsightCard } from "@/components/market-trend-chart"
import {
  TrendingUp, Boxes, Layers, Sparkles, DollarSign, Target, Activity,
  ArrowRight, Hammer, Coins, Shield, Shuffle, Crosshair, BarChart3
} from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { SystemMetrics } from "@/types/metrics"
import type { BazaarItemsResponse } from "@/types/bazaar"
import { FeatureCard } from '@/components/feature-card'
import { GradientSection } from '@/components/gradient-section'

const formatNumber = (value: number) => value.toLocaleString('en-US')

/** Compact coin formatting for large numbers (e.g. 3.26M, 1.2B). */
const formatCompact = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}k`
  return Math.round(value).toLocaleString('en-US')
}

const ROADMAP = [
  { title: "Craft Flipping", icon: Hammer, color: "text-blue-400", status: "Coming soon", tab: "craft-flipping" },
  { title: "NPC Flipping", icon: Coins, color: "text-amber-400", status: "Coming soon", tab: "npc-flipping" },
  { title: "Budget Planner", icon: DollarSign, color: "text-rose-400", status: "Planned", tab: "budget-planner" },
  { title: "Auction House", icon: BarChart3, color: "text-indigo-400", status: "Considering", tab: "auction-house" },
]

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
            <Button asChild size="lg" className="transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
              <Link href="/dashboard/strategies/flipping">
                <TrendingUp className="h-4 w-4" />
                Find Flips
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/bazaar-items">
                <Boxes className="h-4 w-4" />
                Browse Market
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/skyblock-items">
                <Layers className="h-4 w-4" />
                Item Catalog
              </Link>
            </Button>
          </div>
        </div>
      </GradientSection>

      {/* Market Overview */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold">Market Overview</h2>
            <p className="text-muted-foreground text-sm">A quick snapshot of the Bazaar right now</p>
          </div>
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
              <Card key={i}><CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-5 w-16" /></div>
                </div>
              </CardContent></Card>
            ))
          ) : (
            <>
              <StatusCard title="Total Items" icon={Boxes} value={formatNumber(metrics?.totalItems || 0)}
                iconColorClass="text-blue-600 dark:text-blue-400" bgColorClass="bg-blue-100 dark:bg-blue-900/20" />
              <StatusCard title="Profitable Items" icon={Target} value={formatNumber(metrics?.profitableItems || 0)}
                iconColorClass="text-green-600 dark:text-green-400" bgColorClass="bg-green-100 dark:bg-green-900/20" />
              <StatusCard title="Avg. Profit Margin" icon={DollarSign} value={`${formatCompact(metrics?.avgProfitMargin)} coins`}
                iconColorClass="text-amber-600 dark:text-amber-400" bgColorClass="bg-amber-100 dark:bg-amber-900/20" />
              <StatusCard title="Market Activity" icon={Activity} value={`${Math.round(metrics?.marketActivityScore || 0)}/100`}
                iconColorClass="text-purple-600 dark:text-purple-400" bgColorClass="bg-purple-100 dark:bg-purple-900/20" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bazaarItemsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="backdrop-blur-sm"><CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-24" /></div>
                  <div className="space-y-1"><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-32" /></div>
                </div>
              </CardContent></Card>
            ))
          ) : bazaarItemsData ? (
            <>
              <MarketInsightCard title="Market Activity" description="Average active orders across top items" metric="activity" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
              <MarketInsightCard title="Price Volatility" description="Current market price spread analysis" metric="volatility" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
              <MarketInsightCard title="Opportunities" description="Items with profitable trading potential" metric="opportunities" itemsData={bazaarItemsData} isLoading={bazaarItemsLoading} />
            </>
          ) : null}
        </div>
      </section>

      {/* Strategies */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-semibold">Strategies</h2>
            <p className="text-sm text-muted-foreground">Live tools and what&apos;s coming next</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/strategies">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>

        {/* Released */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReleasedStrategy
            icon={Shuffle} accent="text-emerald-400"
            title="Bazaar Flipping"
            description="Find quick buy/sell gaps with intelligent scoring, risk assessment, and per-hour profit estimates."
            openHref="/dashboard/strategies/flipping"
            learnHref="/dashboard/strategies?tab=bazaar-flipping"
          />
          <ReleasedStrategy
            icon={Crosshair} accent="text-rose-400"
            title="Bazaar Manipulation"
            description="Corner thin-supply markets within budget and set the price, with a full cost-to-corner and resell plan."
            openHref="/dashboard/strategies/manipulation"
            learnHref="/dashboard/strategies?tab=bazaar-manipulation"
          />
        </div>

        {/* Roadmap (compact) */}
        <FeatureCard backgroundStyle="subtle">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">On the roadmap</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            {ROADMAP.map((r) => (
              <Link
                key={r.title}
                href={`/dashboard/strategies?tab=${r.tab}`}
                className="group flex items-center gap-2.5 rounded-md py-1.5 px-1 -mx-1 hover:bg-muted/40 transition-colors"
              >
                <r.icon className={`h-4 w-4 shrink-0 ${r.color}`} />
                <span className="text-sm font-medium truncate flex-1">{r.title}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{r.status}</span>
              </Link>
            ))}
          </div>
        </FeatureCard>
      </section>

      {/* About (slim) */}
      <section>
        <Card>
          <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5 max-w-2xl">
              <h3 className="text-base font-semibold">A SkyBlock Bazaar analytics tool</h3>
              <p className="text-sm text-muted-foreground">
                A personal project that polls Hypixel Bazaar data every minute, analyzes price patterns,
                and turns them into trading strategies. Built for learning and fun — not affiliated with Hypixel. 💜
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {["Spring Boot", "Next.js", "PostgreSQL", "Docker"].map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] text-muted-foreground border-border">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function ReleasedStrategy({
  icon: Icon, accent, title, description, openHref, learnHref,
}: {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  title: string
  description: string
  openHref: string
  learnHref: string
}) {
  return (
    <FeatureCard backgroundStyle="glass">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accent}`} />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
          Live
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4 flex-1">{description}</p>
      <div className="flex gap-2 mt-auto">
        <Button asChild size="sm" className="flex-1">
          <Link href={openHref}>Open</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={learnHref}>Learn more</Link>
        </Button>
      </div>
    </FeatureCard>
  )
}
