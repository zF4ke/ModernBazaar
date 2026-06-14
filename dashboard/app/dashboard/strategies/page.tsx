"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  TrendingUp, ArrowRight, Shuffle, Crosshair, Clock, Coins, ShieldAlert, Timer,
  Search, Calculator, Scale, AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { GradientSection } from '@/components/gradient-section'
import { LoginCheck } from '@/components/login-check'
import { StrategyNavigationTabs } from './_components/strategy-navigation-tabs'
import { StrategyFAQSection } from './_components/strategy-faq-section'

type Guide = {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  tint: string
  glow: string
  title: string
  tagline: string
  href: string
  cta: string
  warning?: string
  how: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[]
  steps: string[]
}

const GUIDES: Record<string, Guide> = {
  "bazaar-flipping": {
    icon: Shuffle, accent: "text-emerald-400", tint: "bg-emerald-500/15", glow: "bg-emerald-500/25",
    title: "Bazaar Flipping",
    tagline: "Buy low, sell high. The steady way to grow your coins.",
    href: "/dashboard/strategies/flipping",
    cta: "Open Bazaar Flipping",
    how: [
      { icon: Clock, title: "Reads the market", text: "Tracks every item over 1h, 6h and 48h to learn what's normal and catch the unusual." },
      { icon: Coins, title: "Scores by profit per hour", text: "Ranks flips by expected coins per hour after the bazaar tax, so you see what's worth your time." },
      { icon: ShieldAlert, title: "Flags the risk", text: "Marks volatile or manipulated-looking prices and thin order books, plus how crowded each item is." },
      { icon: Timer, title: "Sizes and times it", text: "Suggests how much to buy for your budget, and how long buys and sells take to fill." },
    ],
    steps: [
      "Set your budget and time horizon, from 15 minutes to a week.",
      "Pick a preset (Fast, Default, Stable) or tune the filters yourself.",
      "Sort by recommended score, or by raw profit per hour.",
      "Place and manage the buy and sell orders in game.",
    ],
  },
  "bazaar-manipulation": {
    icon: Crosshair, accent: "text-blue-400", tint: "bg-blue-500/15", glow: "bg-blue-500/25",
    title: "Bazaar Manipulation",
    tagline: "Corner thin markets, set the price, and sell into overpriced buy orders.",
    href: "/dashboard/strategies/manipulation",
    cta: "Open Bazaar Manipulation",
    warning: "The highest-risk strategy. It ties up a lot of coins in one item and relies on demand holding. Only risk what you can afford to hold.",
    how: [
      { icon: Search, title: "Finds thin markets", text: "Looks for items with few sellers but strong demand, the kind a single trader can corner." },
      { icon: Calculator, title: "Costs the corner", text: "Adds up every visible sell offer so you know what it takes to buy out the whole market." },
      { icon: Scale, title: "Plans the exit", text: "Computes your break-even after tax, the sell wall, and the inflated buy order at your target ROI." },
      { icon: Timer, title: "Estimates the time", text: "Shows how long it takes to offload your stock based on hourly demand." },
    ],
    steps: [
      "Set your max budget and a target ROI (2x is a sensible default).",
      "Pick your bazaar tax rate so the break-even math is right.",
      "Sort by score, total profit, demand vs supply, or cheapest to corner.",
      "Open any result for the full step-by-step plan.",
    ],
  },
}

function StrategyGuideView({ g }: { g: Guide }) {
  return (
    <div className="space-y-6">
      {/* Overview + CTA */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-6">
        <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl opacity-60 ${g.glow}`} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${g.tint}`}>
            <g.icon className={`h-6 w-6 ${g.accent}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{g.title}</h2>
            <p className="text-sm text-muted-foreground">{g.tagline}</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href={g.href}>{g.cta} <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </div>

      {g.warning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200/90">{g.warning}</p>
        </div>
      )}

      {/* How it works */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">How it works</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {g.how.map((h) => (
            <div key={h.title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${g.tint}`}>
                <h.icon className={`h-4 w-4 ${g.accent}`} />
              </div>
              <div>
                <h4 className="font-medium">{h.title}</h4>
                <p className="text-sm text-muted-foreground">{h.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How to use it */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">How to use it</h3>
        <ol className="space-y-3">
          {g.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${g.tint} ${g.accent}`}>
                {i + 1}
              </span>
              <span className="text-sm text-muted-foreground pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function ComingSoon() {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <h2 className="text-xl font-semibold mb-1">Coming soon</h2>
      <p className="text-sm text-muted-foreground">This strategy is in development. Check back later.</p>
    </div>
  )
}

function TradingStrategiesContent() {
  const [activeStrategy, setActiveStrategy] = useState("bazaar-flipping")
  const searchParams = useSearchParams()

  useEffect(() => {
    setActiveStrategy(searchParams.get("tab") || "bazaar-flipping")
  }, [searchParams])

  const guide = GUIDES[activeStrategy]

  return (
    <div className="space-y-8">
      <GradientSection variant="hero" padding="md" backdropBlur="none">
        <div className="relative z-10 flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Trading tools
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tools to help you profit</h1>
          <p className="text-muted-foreground max-w-2xl">
            Two strategies are live. Pick one to see how it works and jump straight in.
          </p>
        </div>
      </GradientSection>

      <StrategyNavigationTabs activeStrategy={activeStrategy} setActiveStrategy={setActiveStrategy} />

      {guide ? <StrategyGuideView g={guide} /> : <ComingSoon />}

      {(activeStrategy === "bazaar-flipping" || activeStrategy === "bazaar-manipulation") && (
        <StrategyFAQSection activeStrategy={activeStrategy} />
      )}
    </div>
  )
}

export default function TradingStrategiesPage() {
  return (
    <LoginCheck
      featureName="Trading Strategies"
      featureDescription="Tools to help you profit in the Hypixel SkyBlock market"
      icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
    >
      <Suspense fallback={
        <div className="space-y-8 animate-pulse">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      }>
        <TradingStrategiesContent />
      </Suspense>
    </LoginCheck>
  )
}
