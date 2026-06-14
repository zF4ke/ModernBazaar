"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Shuffle, Crosshair, Hammer, Coins, DollarSign, BarChart3, ArrowRight,
} from "lucide-react"
import { GradientSection } from '@/components/gradient-section'
import { LoginCheck } from '@/components/login-check'

const LIVE = [
  {
    title: "Bazaar Flipping",
    desc: "Buy low, sell high. Buy/sell gaps ranked by profit per hour after tax, with risk flags, budget sizing and fill-time estimates.",
    icon: Shuffle, accent: "text-emerald-400", tint: "bg-emerald-500/15", glow: "bg-emerald-500/25",
    href: "/dashboard/strategies/flipping",
  },
  {
    title: "Bazaar Manipulation",
    desc: "Corner thin-supply markets within budget. You get the full plan: cost to corner, break-even after tax, the buy/sell ladder, and sell-through time.",
    icon: Crosshair, accent: "text-blue-400", tint: "bg-blue-500/15", glow: "bg-blue-500/25",
    href: "/dashboard/strategies/manipulation",
  },
]

const SOON = [
  { title: "Craft Flipping", icon: Hammer },
  { title: "NPC Flipping", icon: Coins },
  { title: "Budget Planner", icon: DollarSign },
  { title: "Auction House", icon: BarChart3 },
]

export default function StrategiesPage() {
  return (
    <LoginCheck
      featureName="Trading Strategies"
      featureDescription="Tools to help you profit in the Hypixel SkyBlock market"
      icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
    >
      <div className="space-y-8">
        <GradientSection variant="hero" padding="md" backdropBlur="none">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Trading tools
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pick your strategy</h1>
            <p className="text-muted-foreground max-w-2xl">
              Two tools are live. Jump into one and start working the market.
            </p>
          </div>
        </GradientSection>

        {/* Live strategies */}
        <div className="grid gap-5 md:grid-cols-2">
          {LIVE.map((s) => (
            <div key={s.title} className="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-6">
              <div className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl opacity-60 ${s.glow}`} />
              <div className="relative flex flex-1 flex-col">
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.tint}`}>
                    <s.icon className={`h-6 w-6 ${s.accent}`} />
                  </div>
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                </div>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <Button asChild className="w-fit">
                  <Link href={s.href}>Open {s.title} <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">More on the way</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOON.map((s) => (
              <div key={s.title} className="flex items-center gap-3 rounded-xl border bg-card p-4 opacity-70">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">Soon</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoginCheck>
  )
}
