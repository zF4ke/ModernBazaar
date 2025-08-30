"use client"

import Link from 'next/link'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { MarketInsightCard } from "@/components/market-trend-chart"
import { TrendingUp, Boxes, Layers, Sparkles, BarChart3, DollarSign, Target, Activity, ArrowRight, Zap, Timer, Users, Loader2, LineChart, Server, Lightbulb } from "lucide-react"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { SystemMetrics } from "@/types/metrics"
import type { BazaarItemsResponse } from "@/types/bazaar"

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

  // Fetch top profitable items
  const { data: topItems, isLoading: itemsLoading } = useBackendQuery<BazaarItemsResponse>(
    '/api/bazaar/items?limit=6&sort=spreaddesc&minBuy=1&minSell=1',
    { 
      refetchInterval: 60000, // Refresh every minute
      queryKey: ['top-items'],
      requireAuth: true
    }
  )

  const formatPercentage = (value: number) => `${value.toFixed(2)}%`
  const formatCurrency = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const formatNumber = (value: number) => value.toLocaleString('en-US')

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section 
        className="relative overflow-hidden rounded-xl border p-6 md:p-8"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
        }}
      >
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
              <Link href="/bazaar-items">
                <Boxes className="h-4 w-4" />
                Browse Market
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/skyblock-items">
                <Layers className="h-4 w-4" />
                Item Catalog
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/strategies/flipping">
                <TrendingUp className="h-4 w-4" />
                Find Flips
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Market Overview */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold">Market Overview</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings" className="text-muted-foreground">
              View Details <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
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
                value={metrics?.avgProfitMargin === 0 ? "Premium Feature" : formatPercentage(metrics?.avgProfitMargin || 0)}
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
          <MarketInsightCard
            title="Market Activity"
            description="Average active orders across top items"
            metric="activity"
          />
          <MarketInsightCard
            title="Price Volatility"
            description="Current market price spread analysis"
            metric="volatility"
          />
          <MarketInsightCard
            title="Opportunities"
            description="Items with profitable trading potential"
            metric="opportunities"
          />
        </div>
      </section>

      {/* Top Opportunities */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold">Top Opportunities</h2>
            <p className="text-sm text-muted-foreground">Items with the highest profit margins right now</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/bazaar-items?sort=spreadPercentage&minSpread=1">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {itemsLoading ? (
          <Card
            style={{
              background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
            }}
          >
            <CardContent className="p-12">
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Scanning market for opportunities...</p>
              </div>
            </CardContent>
          </Card>
        ) : topItems?.items?.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topItems.items.slice(0, 6).map((item, index) => {
              // Use snapshot data if available, otherwise use hour summary data
              const snapshot = item.snapshot
              const hourSummary = item.lastHourSummary
              const productId = snapshot?.productId || hourSummary?.productId || 'unknown'
              const displayName = snapshot?.displayName || hourSummary?.displayName || productId
              const buyPrice = snapshot?.instantBuyPrice || hourSummary?.closeInstantBuyPrice || 0
              const sellPrice = snapshot?.instantSellPrice || hourSummary?.closeInstantSellPrice || 0
              const spreadPercentage = sellPrice > 0 ? ((buyPrice - sellPrice) / sellPrice) * 100 : 0
              
              return (
                <Card key={productId} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate text-sm">
                          {displayName}
                        </h3>
                        <Badge variant="secondary" className="shrink-0">
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Buy Price</p>
                          <p className="font-medium">{formatCurrency(buyPrice)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sell Price</p>
                          <p className="font-medium">{formatCurrency(sellPrice)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Profit Margin</span>
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {formatPercentage(spreadPercentage)}
                        </Badge>
                      </div>
                      
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={`/bazaar-items/${productId}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card 
            className="border-dashed"
            style={{
              background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
            }}
          >
            <CardContent className="p-12 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Market is Quiet Right Now</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No high-profit opportunities available at the moment. This is normal as market conditions change throughout the day.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  <Button asChild variant="default" size="sm">
                    <Link href="/bazaar-items">
                      Browse All Items
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/strategies/flipping">
                      Try Strategies
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* About the Project */}
       <section className="space-y-6">
         <h2 className="text-xl md:text-2xl font-semibold">Why I Built This</h2>
                 <Card 
          style={{
            background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
          }}
        >
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
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Fetches Hypixel Bazaar data every few minutes and stores it intelligently
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Analyzes price patterns and identifies profitable trading opportunities
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
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
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Java/Spring Boot backend with PostgreSQL storage
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
                    Next.js dashboard with real-time charts and analytics
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
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
      </section>
    </div>
  )
}
