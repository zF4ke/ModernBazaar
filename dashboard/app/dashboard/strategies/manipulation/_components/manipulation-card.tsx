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
  ArrowUpCircle,
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

  const profitColor = o.totalProfit >= 10_000_000 ? "text-gain" : "text-foreground"
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
      className={`group overflow-hidden bg-card cursor-pointer transition-[border-color,box-shadow,transform] duration-200 ease-out ${isExpanded ? "border-elite/35 shadow-[0_16px_40px_-20px_hsl(230_60%_3%/0.8)]" : "border-border/60 hover:border-muted-foreground/30 hover:-translate-y-0.5"}`}
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
            <div className="font-mono text-sm font-semibold">{format(o.score, 2)}</div>
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
          <div className={`font-mono text-2xl font-bold tracking-tight mb-1 ${profitColor}`}>
            {formatCompact(o.totalProfit)}
            <span className="ml-1.5 font-sans text-sm font-medium text-muted-foreground">coins</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            <div className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3 text-loss" />
              <span>Corner: <span className="font-mono">{formatCompact(o.cornerCost)}</span></span>
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
          <div className="rounded-md bg-loss/[0.07] p-2.5">
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingCart className="h-3 w-3 text-loss" />
              Avg buy cost
            </div>
            <div className="font-mono text-sm font-semibold text-loss">{format(o.avgBuyCostPerUnit, 1)}</div>
          </div>
          <div className="rounded-md bg-gain/[0.07] p-2.5">
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3 text-gain" />
              Min resell
            </div>
            <div className="font-mono text-sm font-semibold text-gain">{format(o.minResellPrice, 1)}</div>
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
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 cursor-help border-loss/50 text-loss">
                      <ShieldAlert className="h-3 w-3 mr-1" />
                      risky
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-xs text-sm">{o.riskNote}</p></TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-loss/50 text-loss">
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
          <div className="animate-rise-in [animation-duration:280ms]">
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-elite" />
                <span className="text-sm font-semibold">The play, step by step</span>
              </div>
              <div className="space-y-3 text-sm">
                <PlanStep
                  n={1} title="Confirm the setup"
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
                  n={2} title="Corner the market"
                  rows={[
                    ["Units to buy out", `${format(o.cornerSupplyUnits, 0)} units`],
                    ["Total cost", `${format(o.cornerCost, 0)} coins`],
                    ["Avg cost / unit", `${format(o.avgBuyCostPerUnit, 2)} coins`],
                  ]}
                  note="Insta-buy every sell offer until you hold all the supply."
                />
                <PlanStep
                  n={3} title="Break-even resell"
                  rows={[
                    [`Min resell (after ${taxPct.toFixed(3)}% tax)`, `${format(o.minResellPrice, 2)} coins`],
                  ]}
                  note="Sell below this and the tax eats your profit."
                />
                <PlanStep
                  n={4} title="Set the sell wall"
                  rows={[
                    ["Sell order price", `${format(o.suggestedSellOrderPrice, 0)} coins`],
                  ]}
                  note="A very high sell order makes the item look valuable and lures buy orders."
                />
                <PlanStep
                  n={5} title="Inflate the buy order"
                  rows={[
                    ["Current top bid", `${format(o.currentHighestBuyOrder, 2)} coins`],
                    ["Double the bid", `${o.buyOrderDoublingSteps} times`],
                    ["Your buy order", `${format(o.targetBuyOrderPrice, 0)} coins`],
                  ]}
                  note="Climb the bid until it's attractive; others outbid you by 0.1 and you insta-sell into them."
                />
                <PlanStep
                  n={6} title="Repeat until sold"
                  rows={[
                    ["Net profit / unit", `${format(o.netProfitPerUnit, 2)} coins`],
                    ["Total profit", `${format(o.totalProfit, 0)} coins`],
                    ["Est. sell-through", formatTime(o.estimatedSellThroughHours)],
                  ]}
                  note="Sell-through is based on new buy-order units, not generic insta-buy demand."
                />
                {o.risky && (
                  <div className="rounded-lg bg-warn/[0.08] p-3">
                    <div className="mb-1.5 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warn" />
                      <span className="font-medium text-warn">Risky play</span>
                    </div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
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

/* The box stays neutral; the value and icon carry the signal color. Eight tinted
   boxes in a row read as noise, eight neutral cells with colored values read as
   an instrument panel. */
const SIGNAL_TONES: Record<SignalTone, { icon: string; value: string }> = {
  good: { icon: "text-gain", value: "text-gain" },
  warn: { icon: "text-warn", value: "text-warn" },
  bad: { icon: "text-loss", value: "text-loss" },
  muted: { icon: "text-muted-foreground", value: "text-foreground" },
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
    <div className="min-h-[58px] rounded-md bg-muted/40 px-2.5 py-2">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
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

/* One quiet shape per step: the number chip carries the sequence, values are
   mono on the foreground. Elite purple marks the sequence chip, nothing else. */
function PlanStep({ n, title, rows, note }: {
  n: number
  title: string
  rows: [string, string][]
  note?: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-elite/[0.12] font-mono text-[11px] font-bold text-elite">
          {n}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-1 pl-[30px] text-xs text-muted-foreground">
        {rows.map(([label, value], i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="shrink-0 font-mono text-foreground">{value}</span>
          </div>
        ))}
        {note && <div className="mt-1.5 border-t border-border/60 pt-1.5 leading-relaxed text-muted-foreground/80">{note}</div>}
      </div>
    </div>
  )
}
