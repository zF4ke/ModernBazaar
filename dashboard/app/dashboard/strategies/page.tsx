"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, Shuffle, Crosshair, Hammer, Coins, DollarSign, BarChart3, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader } from '@/components/page-shell'
import { LoginCheck } from '@/components/login-check'

const LIVE = [
  {
    title: "Bazaar Flipping",
    desc: "Buy low, sell high. Buy/sell gaps ranked by profit per hour after tax, with risk flags, budget sizing and fill-time estimates.",
    icon: Shuffle, tone: "accent" as const,
    href: "/dashboard/strategies/flipping",
  },
  {
    title: "Bazaar Manipulation",
    desc: "Corner thin-supply markets within budget. You get the full plan: cost to corner, break-even after tax, the buy/sell ladder, and sell-through time.",
    icon: Crosshair, tone: "elite" as const,
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
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader
          title="Pick your strategy"
          description="Two tools are live. Jump into one and start working the market."
        />

        {/* Live strategies */}
        <div className="grid gap-5 md:grid-cols-2">
          {LIVE.map((s) => (
            <div
              key={s.title}
              className={cn(
                "group flex flex-col rounded-xl border bg-card p-6 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5",
                s.tone === "elite" ? "hover:border-elite/40" : "hover:border-primary/40",
              )}
            >
              <div className="mb-3 flex items-center gap-3.5">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-transform duration-200 ease-spring group-hover:scale-110",
                  s.tone === "elite" ? "bg-elite/10 text-elite" : "bg-primary/10 text-primary",
                )}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">{s.title}</h2>
              </div>
              <p className="mb-5 flex-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              <Button asChild className="w-fit" variant={s.tone === "elite" ? "outline" : "default"}>
                <Link href={s.href}>Open {s.title} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Coming soon */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">More on the way</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOON.map((s) => (
              <div key={s.title} className="flex items-center gap-3 rounded-lg border border-border/60 p-4">
                <s.icon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                <span className="min-w-0 truncate text-sm font-medium text-foreground/80">{s.title}</span>
                <span className="ml-auto rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">Soon</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoginCheck>
  )
}
