"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FlipOpportunity, FlippingQuery } from "@/types/strategies"
import {
  Star,
  DollarSign,
  Package,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Info,
  Clock
} from "lucide-react"
import { format, formatTime } from "./utils"
import { PROFIT_HIGHLIGHT } from "./badge-thresholds"
import { StatusBadges } from "./opportunity-card/status-badges"
import { StepPurchase } from "./opportunity-card/step-purchase"
import { StepBuyOrders } from "./opportunity-card/step-buy-orders"
import { StepSellOrders } from "./opportunity-card/step-sell-orders"
import { StepProfit } from "./opportunity-card/step-profit"
import { RiskWarning } from "./opportunity-card/risk-warning"
import React from "react"

interface OpportunityCardProps {
  o: FlipOpportunity
  query: FlippingQuery
  bazaarTaxRate: number
  fav: boolean
  onToggleFav: (id: string) => void
  isExpanded: boolean
  setExpandedCard: (id: string | null) => void
}

function OpportunityCardImpl({ o, query, bazaarTaxRate, fav, onToggleFav, isExpanded, setExpandedCard }: OpportunityCardProps) {
  const buy = (o.buyOrderPrice ?? o.instantSellPrice) || 0
  const sell = (o.sellOrderPrice ?? o.instantBuyPrice) || 0
  const d = o.demandPerHour ?? 0
  const s = o.supplyPerHour ?? 0
  const ratio = d > 0 ? s / d : 0
  const riskPct = o.riskScore !== undefined ? Math.round(o.riskScore * 100) : undefined
  const href = `/dashboard/bazaar-items/${o.productId}`
  const spreadPctVal = (o.spreadPct ?? 0) * 100

  const profitColor = (o.reasonableProfitPerHour ?? 0) * (query.horizonHours || 1) >= PROFIT_HIGHLIGHT
    ? 'text-emerald-400'
    : 'text-foreground'

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return
    if (!isExpanded) {
      setExpandedCard(o.productId)
      const cardElement = e.currentTarget as HTMLElement
      setTimeout(() => {
        requestAnimationFrame(() => {
          cardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        })
      }, 0)
    }
  }
  const handleCollapse = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setExpandedCard(null) }

  return (
    <Card
      key={o.productId}
      className={`group overflow-hidden transition-all ease-out bg-background/80 border-border/50 cursor-pointer hover:shadow-lg hover:border-border ${isExpanded ? 'shadow-xl' : 'hover:border-muted-foreground/30'}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-semibold truncate text-base">
                {o.displayName || o.productId}
              </div>
              <button
                aria-label={fav ? 'Unfavorite' : 'Favorite'}
                aria-pressed={fav}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(o.productId) }}
                className={`p-1 rounded-md transition-colors ${fav ? 'bg-amber-500/20 text-amber-400' : 'text-muted-foreground hover:bg-muted hover:text-amber-400'}`}
              >
                <Star className={`h-4 w-4 ${fav ? 'fill-amber-400' : ''}`} />
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
            <div className={`text-xs text-muted-foreground/50 transition-all mt-1 ${isExpanded ? 'text-muted-foreground/70' : 'group-hover:text-muted-foreground'}`}>⋯</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 pb-0">
        <div className="bg-border/20 border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Expected Profit
                {query.horizonHours && query.horizonHours !== 1 && (
                  <span className="text-muted-foreground"> ({format(query.horizonHours, 1)}h)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                {query.horizonHours && query.horizonHours !== 1
                  ? `${format((o.suggestedUnitsPerHour || 0) * query.horizonHours, 0)} units (${format(query.horizonHours, 1)}h)`
                  : `${format(o.suggestedUnitsPerHour, 0)} units/hr`
                }
              </span>
            </div>
          </div>
          <div className={`text-2xl font-bold mb-1 ${profitColor}`}>
            {format((o.reasonableProfitPerHour || 0) * (query.horizonHours || 1) * (1 - bazaarTaxRate), 0)} coins
            {query.horizonHours && query.horizonHours !== 1 && (
              <span className="text-sm text-muted-foreground ml-1">
                ({format(query.horizonHours, 1)}h)
              </span>
            )}
          </div>
          {o.suggestedTotalFillHours || o.suggestedBuyFillHours || o.suggestedSellFillHours ? (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
              {o.suggestedBuyFillHours && (
                <div className="flex items-center gap-1">
                  <ArrowDown className="h-3 w-3 text-red-400" />
                  <span>Buy: {formatTime(o.suggestedBuyFillHours)}</span>
                </div>
              )}
              {o.suggestedSellFillHours && (
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-emerald-400" />
                  <span>Sell: {formatTime(o.suggestedSellFillHours)}</span>
                </div>
              )}
              {o.suggestedTotalFillHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>Total: {formatTime(o.suggestedTotalFillHours)}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
            <div className="flex items-center gap-1 text-xs text-red-300 mb-1">
              <ArrowDown className="h-3 w-3" />
              Buy at
            </div>
            <div className="text-sm font-mono font-semibold text-red-400">{format(buy, 2)}</div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2">
            <div className="flex items-center gap-1 text-xs text-emerald-300 mb-1">
              <ArrowUp className="h-3 w-3" />
              Sell at
            </div>
            <div className="text-sm font-mono font-semibold text-emerald-400">{format(sell, 2)}</div>
          </div>
        </div>

        <div className="space-y-2">
          <StatusBadges o={o} riskPct={riskPct} spreadPctVal={spreadPctVal} d={d} s={s} format={format} />
          {!isExpanded && (
            <div className="flex justify-center pt-1 pb-2">
              <div className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center rounded-md">
                <ChevronDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </div>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className={`overflow-hidden transition-all duration-100 ease-out ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Trading Tutorial</span>
              </div>
              <div className="space-y-3 text-sm">
                <StepPurchase o={o} query={query} buy={buy} />
                <StepBuyOrders o={o} buy={buy} />
                <StepSellOrders o={o} sell={sell} bazaarTaxRate={bazaarTaxRate} />
                <StepProfit o={o} buy={buy} sell={sell} bazaarTaxRate={bazaarTaxRate} query={query} />
                {riskPct !== undefined && riskPct >= 30 && <RiskWarning riskPct={riskPct} />}
                <div className="text-center pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCollapse}
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
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

// Memoized so typing in unrelated inputs (e.g. the budget field) or expanding a
// sibling card doesn't re-render every card. Props are primitives/stable refs:
// `o`/`query` keep identity across budget keystrokes, `onToggleFav`/`setExpandedCard`
// are stable, and `isExpanded` is a precomputed boolean instead of the shared id.
export const OpportunityCard = React.memo(OpportunityCardImpl)
