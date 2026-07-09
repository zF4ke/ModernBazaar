"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ManipulationOpportunity } from "@/types/strategies"
import {
  Star,
  Crosshair,
  Package,
  ShoppingCart,
  Tag,
  TrendingUp,
  ShieldAlert,
  Scale,
  ChevronDown,
  ChevronUp,
  Info,
  Search,
  Calculator,
  ArrowUpCircle,
  Repeat,
  AlertCircle,
  Clock,
} from "lucide-react"
import { format, formatTime, formatCompact } from "./utils"
import React from "react"

interface ManipulationCardProps {
  o: ManipulationOpportunity
  fav: boolean
  onToggleFav: (id: string) => void
  expandedCard: string | null
  setExpandedCard: (id: string | null) => void
}

export function ManipulationCard({ o, fav, onToggleFav, expandedCard, setExpandedCard }: ManipulationCardProps) {
  const href = `/dashboard/bazaar-items/${o.productId}`
  const isExpanded = expandedCard === o.productId
  const ratio = o.demandSupplyRatio ?? 0
  const taxPct = (o.taxRate ?? 0.01125) * 100

  const profitColor = o.totalProfit >= 10_000_000 ? "text-emerald-400" : "text-foreground"
  const pressureTone = pressureSignalTone(o.buyOrderUnitsPerHour, o.sellPressureUnitsPerHour)

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return
    if (!isExpanded) {
      setExpandedCard(o.productId)
      const cardElement = e.currentTarget as HTMLElement
      setTimeout(() => {
        requestAnimationFrame(() => {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" })
        })
      }, 0)
    }
  }
  const handleCollapse = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setExpandedCard(null) }

  return (
    <Card
      key={o.productId}
      className={`group overflow-hidden transition-all ease-out bg-background/80 border-border/50 cursor-pointer hover:shadow-lg hover:border-border ${isExpanded ? "shadow-xl" : "hover:border-muted-foreground/30"}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-semibold truncate text-base">{o.displayName || o.productId}</div>
              <button
                aria-label={fav ? "Unfavorite" : "Favorite"}
                aria-pressed={fav}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(o.productId) }}
                className={`p-1 rounded-md transition-colors ${fav ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-amber-400"}`}
              >
                <Star className={`h-4 w-4 ${fav ? "fill-amber-400" : ""}`} />
              </button>
            </div>
            <Link href={href} className="inline-block">
              <span className="text-xs text-muted-foreground hover:underline hover:decoration-2 transition-all cursor-pointer">
                {o.productId}
              </span>
            </Link>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="text-sm font-semibold">{format(o.score, 2)}</div>
            <div className={`text-xs text-muted-foreground/50 transition-all mt-1 ${isExpanded ? "text-muted-foreground/70" : "group-hover:text-muted-foreground"}`}>⋯</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0 pb-0">
        {/* Hero: total profit */}
        <div className="bg-border/20 border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Crosshair className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Est. Profit (after tax)</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                {format(o.cornerSupplyUnits, 0)} units
              </span>
            </div>
          </div>
          <div className={`text-2xl font-bold mb-1 ${profitColor}`}>{formatCompact(o.totalProfit)} coins</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            <div className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3 text-red-400" />
              <span>Corner: {formatCompact(o.cornerCost)}</span>
            </div>
            {o.estimatedSellThroughHours ? (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Sell-through: {formatTime(o.estimatedSellThroughHours)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Buy / Sell prices */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
            <div className="flex items-center gap-1 text-xs text-red-300 mb-1">
              <ShoppingCart className="h-3 w-3" />
              Avg buy cost
            </div>
            <div className="text-sm font-mono font-semibold text-red-400">{format(o.avgBuyCostPerUnit, 1)}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
            <div className="flex items-center gap-1 text-xs text-emerald-300 mb-1">
              <Tag className="h-3 w-3" />
              Min resell
            </div>
            <div className="text-sm font-mono font-semibold text-emerald-400">{format(o.minResellPrice, 1)}</div>
          </div>
        </div>

        {/* Market signals */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SignalCell
              icon={Scale}
              label="D/S"
              value={`${format(ratio, 1)}x`}
              tone={valueSignalTone(ratio, 3, 1.5)}
            />
            <SignalCell
              icon={ShoppingCart}
              label="Buy Orders"
              value={o.createdBuyOrdersPerHour !== undefined ? `+${format(o.createdBuyOrdersPerHour, 1)}/h` : "-"}
              tone={o.createdBuyOrdersPerHour !== undefined ? valueSignalTone(o.createdBuyOrdersPerHour, 3, 1) : "muted"}
            />
            <SignalCell
              icon={AlertCircle}
              label="Sell Orders"
              value={o.createdSellOrdersPerHour !== undefined ? `+${format(o.createdSellOrdersPerHour, 1)}/h` : "-"}
              tone={o.createdSellOrdersPerHour !== undefined ? inverseSignalTone(o.createdSellOrdersPerHour, 2, 5) : "muted"}
            />
            <SignalCell
              icon={TrendingUp}
              label="Exit"
              value={formatCompact(o.buyOrderUnitsPerHour)}
              tone={valueSignalTone(o.buyOrderUnitsPerHour ?? 0, 500, 100)}
            />
            <SignalCell
              icon={AlertCircle}
              label="Pressure"
              value={`${formatCompact(o.sellPressureUnitsPerHour)}/h`}
              tone={pressureTone}
            />
            <SignalCell
              icon={ArrowUpCircle}
              label="Outbid"
              value={`${format(o.bidUpMovesPerHour, 1)}/h`}
              tone={valueSignalTone(o.bidUpMovesPerHour ?? 0, 3, 1)}
            />
            <SignalCell
              icon={Search}
              label="Attention"
              value={o.flipperAttentionScore !== undefined ? `${format(o.flipperAttentionScore * 100, 0)}%` : "-"}
              tone={valueSignalTone(o.flipperAttentionScore ?? 0, 0.55, 0.30)}
            />
            <SignalCell
              icon={Package}
              label="Sell Items"
              value={format(o.activeSellOrders, 0)}
              tone="muted"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {o.risky && (
              o.riskNote ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 cursor-help border-red-500/50 text-red-400">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      risky
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-sm">{o.riskNote}</p></TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-500/50 text-red-400">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  risky
                </Badge>
              )
            )}
          </div>
          {!isExpanded && (
            <div className="flex justify-center pt-1 pb-2">
              <div className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center rounded-md">
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </div>
            </div>
          )}
        </div>

        {/* Expanded plan */}
        {isExpanded && (
          <div className="overflow-hidden transition-all duration-100 ease-out opacity-100">
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Manipulation Plan</span>
              </div>
              <div className="space-y-3 text-sm">
                <PlanStep
                  color="blue" icon={Search} title="Step 1: Confirm the setup"
                  rows={[
                    ["Demand / supply", `${format(ratio, 1)}x`],
                    ["Buyers / hour", o.demandPerHour ? format(o.demandPerHour, 0) : "—"],
                    ["Standing sell orders", format(o.activeSellOrders, 0)],
                    ["Standing buy orders", format(o.activeBuyOrders, 0)],
                    ["Sell volume", format(o.sellVolume, 0)],
                    ["Buy volume", format(o.buyVolume, 0)],
                    ["Created buy orders / hour", o.createdBuyOrdersPerHour !== undefined ? format(o.createdBuyOrdersPerHour, 1) : "—"],
                    ["Created sell orders / hour", o.createdSellOrdersPerHour !== undefined ? format(o.createdSellOrdersPerHour, 1) : "—"],
                    ["Buy-order units / hour", o.buyOrderUnitsPerHour !== undefined ? format(o.buyOrderUnitsPerHour, 0) : "—"],
                    ["Sell pressure units / hour", o.sellPressureUnitsPerHour !== undefined ? format(o.sellPressureUnitsPerHour, 0) : "—"],
                    ["Top-bid raises / hour", o.bidUpMovesPerHour !== undefined ? format(o.bidUpMovesPerHour, 1) : "—"],
                    ["Top-bid rise / hour", o.bidUpPriceDeltaPerHour !== undefined ? `${format(o.bidUpPriceDeltaPerHour, 1)} coins` : "—"],
                    ["Flip attention", o.flipperAttentionScore !== undefined ? `${format(o.flipperAttentionScore * 100, 0)}%` : "—"],
                    ["Flip profit / hour", o.flipperProfitPerHour !== undefined ? `${formatCompact(o.flipperProfitPerHour)} coins` : "—"],
                  ]}
                  note="Best targets have fresh buy-order depth, active top-bid raises, flipper attention, and very little sell pressure."
                />
                <PlanStep
                  color="red" icon={ShoppingCart} title="Step 2: Corner the market"
                  rows={[
                    ["Units to buy out", `${format(o.cornerSupplyUnits, 0)} units`],
                    ["Total cost", `${format(o.cornerCost, 0)} coins`],
                    ["Avg cost / unit", `${format(o.avgBuyCostPerUnit, 2)} coins`],
                  ]}
                  note="Insta-buy every sell offer until you hold all the supply."
                />
                <PlanStep
                  color="emerald" icon={Calculator} title="Step 3: Break-even resell"
                  rows={[
                    [`Min resell (after ${taxPct.toFixed(3)}% tax)`, `${format(o.minResellPrice, 2)} coins`],
                  ]}
                  note="Sell below this and the tax eats your profit."
                />
                <PlanStep
                  color="purple" icon={Tag} title="Step 4: Set the sell wall"
                  rows={[
                    ["Sell order price", `${format(o.suggestedSellOrderPrice, 0)} coins`],
                  ]}
                  note="A very high sell order makes the item look valuable and lures buy orders."
                />
                <PlanStep
                  color="amber" icon={ArrowUpCircle} title="Step 5: Inflate the buy order"
                  rows={[
                    ["Current top bid", `${format(o.currentHighestBuyOrder, 2)} coins`],
                    ["Double it", `${o.buyOrderDoublingSteps}x →`],
                    ["Your buy order", `${format(o.targetBuyOrderPrice, 0)} coins`],
                  ]}
                  note="Climb the bid until it's attractive; others outbid you by 0.1 and you insta-sell into them."
                />
                <PlanStep
                  color="emerald" icon={Repeat} title="Step 6: Repeat until sold"
                  rows={[
                    ["Net profit / unit", `${format(o.netProfitPerUnit, 2)} coins`],
                    ["Total profit", `${format(o.totalProfit, 0)} coins`],
                    ["Est. sell-through", formatTime(o.estimatedSellThroughHours)],
                  ]}
                  note="Sell-through is based on new buy-order units, not generic insta-buy demand."
                />
                {o.risky && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span className="font-medium text-amber-300">Risk Warning</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.riskNote || "Prices already look atypical."} Manipulation ties up large capital and other players can dump supply or undercut you. Estimates assume current demand holds.
                    </div>
                  </div>
                )}
                <div className="text-center pb-2">
                  <Button variant="ghost" size="sm" onClick={handleCollapse} className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type SignalTone = "good" | "warn" | "bad" | "muted"

const SIGNAL_TONES: Record<SignalTone, { box: string; icon: string; value: string }> = {
  good: {
    box: "border-emerald-500/25 bg-emerald-500/10",
    icon: "text-emerald-400",
    value: "text-emerald-300",
  },
  warn: {
    box: "border-amber-500/25 bg-amber-500/10",
    icon: "text-amber-400",
    value: "text-amber-300",
  },
  bad: {
    box: "border-red-500/25 bg-red-500/10",
    icon: "text-red-400",
    value: "text-red-300",
  },
  muted: {
    box: "border-border/50 bg-border/15",
    icon: "text-muted-foreground",
    value: "text-foreground",
  },
}

function SignalCell({ icon: Icon, label, value, sublabel, tone }: {
  icon: any
  label: string
  value: string
  sublabel?: string
  tone: SignalTone
}) {
  const c = SIGNAL_TONES[tone]
  return (
    <div className={`min-h-[58px] rounded border px-2 py-2 ${c.box}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-normal text-muted-foreground">
        <Icon className={`h-3 w-3 ${c.icon}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className={`truncate font-mono text-sm font-semibold leading-tight ${c.value}`}>{value}</div>
      {sublabel ? <div className="truncate text-[10px] leading-tight text-muted-foreground/80">{sublabel}</div> : null}
    </div>
  )
}

function valueSignalTone(value: number, goodAt: number, okayAt: number): SignalTone {
  if (!Number.isFinite(value) || value <= 0) return "muted"
  if (value >= goodAt) return "good"
  if (value >= okayAt) return "warn"
  return "muted"
}

function inverseSignalTone(value: number, goodAtOrBelow: number, badAtOrAbove: number): SignalTone {
  if (!Number.isFinite(value)) return "muted"
  if (value <= goodAtOrBelow) return "good"
  if (value >= badAtOrAbove) return "bad"
  return "warn"
}

function pressureSignalTone(exitUnits?: number, pressureUnits?: number): SignalTone {
  if (exitUnits === undefined || pressureUnits === undefined || !Number.isFinite(exitUnits) || !Number.isFinite(pressureUnits)) {
    return "muted"
  }
  const ratio = pressureUnits / (exitUnits + 1)
  if (ratio <= 0.20) return "good"
  if (ratio <= 0.50) return "warn"
  return "bad"
}

const COLOR_MAP: Record<string, { box: string; title: string; mono: string; border: string }> = {
  blue:    { box: "bg-blue-500/10 border-blue-500/20",       title: "text-blue-300",    mono: "text-blue-300",    border: "border-blue-500/20" },
  red:     { box: "bg-red-500/10 border-red-500/20",         title: "text-red-300",     mono: "text-red-300",     border: "border-red-500/20" },
  emerald: { box: "bg-emerald-500/10 border-emerald-500/20", title: "text-emerald-300", mono: "text-emerald-300", border: "border-emerald-500/20" },
  purple:  { box: "bg-purple-500/10 border-purple-500/20",   title: "text-purple-300",  mono: "text-purple-300",  border: "border-purple-500/20" },
  amber:   { box: "bg-amber-500/10 border-amber-500/20",     title: "text-amber-300",   mono: "text-amber-300",   border: "border-amber-500/20" },
}

function PlanStep({ color, icon: Icon, title, rows, note }: {
  color: keyof typeof COLOR_MAP | string
  icon: any
  title: string
  rows: [string, string][]
  note?: string
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue
  return (
    <div className={`${c.box} border rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${c.title}`} />
        <span className={`font-medium ${c.title}`}>{title}</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-center justify-between">
            <span>{label}:</span>
            <span className={`font-mono ${c.mono}`}>{value}</span>
          </div>
        ))}
        {note && <div className={`pt-1 mt-1 border-t ${c.border} text-muted-foreground/80`}>{note}</div>}
      </div>
    </div>
  )
}
