"use client"

import Link from 'next/link'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { MarketInsightCard } from "@/components/market-trend-chart"
import { TrendingUp, Boxes, Layers, Sparkles, BarChart3, DollarSign, Target, Activity, ArrowRight, Zap, Timer, Users, LineChart, Server, Lightbulb, Hammer, Coins, ArrowRightLeft, Shield } from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { SystemMetrics } from "@/types/metrics"
import type { BazaarItemsResponse } from "@/types/bazaar"
import { FeatureCard } from '@/components/feature-card'
import { GradientSection } from '@/components/gradient-section'

export default function Dashboard() {
  const { user } = useAuth0()
  const firstName = user?.name?.split(' ')[0] ?? 'Trader'

  // Fetch system metrics
  const { data: metrics, isLoading: metricsLoading } = useBackendQuery<SystemMetrics>(
    '/api/metrics',
    { 
      refetchInterval: 30000, // Refresh every 30 seconds
      queryKey: ['metrics'],
      requireAuth: false
    }
  )

  // Fetch bazaar items data once for market insights
  const { data: bazaarItemsData, isLoading: bazaarItemsLoading } = useBackendQuery<BazaarItemsResponse>(
    '/api/bazaar/items?limit=10&sort=spreaddesc',
    {
      refetchInterval: 300000, // Refresh every 5 minutes
      queryKey: ['market-insights'],
      requireAuth: true
    }
  )

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`
  const formatCurrency = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const formatNumber = (value: number) => value.toLocaleString('en-US')

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <GradientSection variant="hero" padding="md" backdropBlur="none">
        <div className="relative z-10 flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4"/>
            Welcome back
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Hi, {firstName}. Ready to spot your next Bazaar flip?
          </h1>
          <p className="text-muted-foreground">
            Watch Hypixel SkyBlock prices, find reliable buy/sell gaps, and flip items with confidence.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/dashboard/bazaar-items">
                <Boxes className="h-4 w-4" />
                Browse Market
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/skyblock-items">
                <Layers className="h-4 w-4" />
                Item Catalog
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/dashboard/strategies/flipping">
                <TrendingUp className="h-4 w-4" />
                Find Flips
              </Link>
            </Button>
          </div>
        </div>
      </GradientSection>

      {/* Market Overview */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold">Market Overview</h2>
          <p className="text-muted-foreground text-sm">
            Get a quick snapshot of the Hypixel SkyBlock Bazaar market
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metricsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatusCard
                title="Total Items"
                icon={Boxes}
                value={formatNumber(metrics?.totalItems || 0)}
                iconColorClass="text-blue-600 dark:text-blue-400"
                bgColorClass="bg-blue-100 dark:bg-blue-900/20"
              />
              <StatusCard
                title="Profitable Items"
                icon={Target}
                value={formatNumber(metrics?.profitableItems || 0)}
                iconColorClass="text-green-600 dark:text-green-400"
                bgColorClass="bg-green-100 dark:bg-green-900/20"
              />
              <StatusCard
                title="Avg. Profit Margin"
                icon={DollarSign}
                value={formatPercentage(metrics?.avgProfitMargin || 0)}
                iconColorClass="text-amber-600 dark:text-amber-400"
                bgColorClass="bg-amber-100 dark:bg-amber-900/20"
              />
              <StatusCard
                title="Market Activity"
                icon={Activity}
                value={`${Math.round(metrics?.marketActivityScore || 0)}/100`}
                iconColorClass="text-purple-600 dark:text-purple-400"
                bgColorClass="bg-purple-100 dark:bg-purple-900/20"
              />
            </>
          )}
        </div>

        {/* Market Insight Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bazaarItemsLoading ? (
            // Show loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : bazaarItemsData ? (
            <>
              <MarketInsightCard
                title="Market Activity"
                description="Average active orders across top items"
                metric="activity"
                itemsData={bazaarItemsData}
                isLoading={bazaarItemsLoading}
              />
              <MarketInsightCard
                title="Price Volatility"
                description="Current market price spread analysis"
                metric="volatility"
                itemsData={bazaarItemsData}
                isLoading={bazaarItemsLoading}
              />
              <MarketInsightCard
                title="Opportunities"
                description="Items with profitable trading potential"
                metric="opportunities"
                itemsData={bazaarItemsData}
                isLoading={bazaarItemsLoading}
              />
            </>
          ) : null}
        </div>
      </section>

      {/* Strategies */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Strategies</h2>
            <p className="text-sm text-muted-foreground">Explore current and upcoming trading features</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/strategies">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
                <h3 className="text-base font-semibold">Bazaar Flipping</h3>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Discover quick buy/sell opportunities with intelligent scoring and risk assessment.
            </p>
            <div className="flex gap-2 mt-auto">
              <Button asChild size="sm" className="w-full bg-white/10 hover:bg-white/15 text-white border-white/20">
                <Link href="/dashboard/strategies/flipping">Open Strategy</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full border-0 bg-black/30 text-white hover:bg-black/60 hover:text-white">
                <Link href="/dashboard/strategies/flipping">Learn More</Link>
              </Button>
            </div>
          </FeatureCard>
          
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hammer className="h-4 w-4 text-blue-500" />
                <h3 className="text-base font-semibold">Craft Flipping</h3>
              </div>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">Coming soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Profit from crafting items by analyzing material costs vs. final prices.
            </p>
          </FeatureCard>
          
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-semibold">NPC Flipping</h3>
              </div>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">Coming soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Maximize profits from daily NPC limits by finding the highest margin items.
            </p>
          </FeatureCard>
          
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <h3 className="text-base font-semibold">Bazaar Manipulation</h3>
              </div>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">Planned</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set market prices and manipulate supply to create profitable opportunities.
            </p>
          </FeatureCard>
          
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-rose-500" />
                <h3 className="text-base font-semibold">Budget Planner</h3>
              </div>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">Planned</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Allocate coins across strategies with risk-adjusted projections.
            </p>
          </FeatureCard>
          
          <FeatureCard backgroundStyle="glass">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <h3 className="text-base font-semibold">Auction House</h3>
              </div>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">Considering</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Snipe and flip AH items using live listings and historical trends.
            </p>
          </FeatureCard>
        </div>
      </section>

      {/* About the Project */}
      <GradientSection variant="hero" padding="md" className="space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold">Why I Built This</h2>
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-xl font-semibold text-primary">
              Building a SkyBlock Bazaar analytics tool
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              What started as a simple Bazaar data collector has grown into a market analysis tool. Built to learn modern development practices while solving a real problem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary" />
                  What this does
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Fetches Hypixel Bazaar data every few minutes and stores it intelligently
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Analyzes price patterns and identifies profitable trading opportunities
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Provides tools and strategies for different trading approaches
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Technical stack
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Java/Spring Boot backend with PostgreSQL storage
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Next.js dashboard with real-time charts and analytics
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Dockerized infrastructure with monitoring (Prometheus, Grafana)
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 border-l-4 border-primary">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Currently working on</p>
                  <p className="text-sm text-muted-foreground">
                    Improving the flipping strategy algorithms, adding more sophisticated risk assessment,
                    and planning ML-based price prediction features. Always learning something new!
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground">
              <p>Personal project • Not affiliated with Hypixel • Built for learning and fun 💜</p>
            </div>
          </CardContent>
        </Card>
      </GradientSection>
    </div>
   )
 }
