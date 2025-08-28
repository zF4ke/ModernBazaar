"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { FlipOpportunity, FlippingQuery } from "@/types/strategies"
import {
  Star,
  DollarSign,
  Package,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  ShieldAlert,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Info,
  Target,
  Calculator,
  AlertCircle,
  Clock
} from "lucide-react"
import { format, formatTime } from "./utils"
import React from "react"

interface OpportunityCardProps {
  o: FlipOpportunity
  query: FlippingQuery
  bazaarTaxRate: number
  fav: boolean
  onToggleFav: (id: string) => void
  expandedCard: string | null
  setExpandedCard: (id: string | null) => void
}

export function OpportunityCard({ o, query, bazaarTaxRate, fav, onToggleFav, expandedCard, setExpandedCard }: OpportunityCardProps) {
  const buy = (o.buyOrderPrice ?? o.instantSellPrice) || 0
  const sell = (o.sellOrderPrice ?? o.instantBuyPrice) || 0
  const d = o.demandPerHour ?? 0
  const s = o.supplyPerHour ?? 0
  const ratio = d > 0 ? s / d : 0
  const riskPct = o.riskScore !== undefined ? Math.round(o.riskScore * 100) : undefined
  const href = `/bazaar-items/${o.productId}`
  const spreadPctVal = (o.spreadPct ?? 0) * 100
  const isExpanded = expandedCard === o.productId

  const profitColor = (o.reasonableProfitPerHour ?? 0) * (query.horizonHours || 1) >= 900000
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
          {(o as any).suggestedTotalFillHours || (o as any).suggestedBuyFillHours || (o as any).suggestedSellFillHours ? (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
              {(o as any).suggestedBuyFillHours && (
                <div className="flex items-center gap-1">
                  <ArrowDown className="h-3 w-3 text-red-400" />
                  <span>Buy: {formatTime((o as any).suggestedBuyFillHours)}</span>
                </div>
              )}
              {(o as any).suggestedSellFillHours && (
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3 text-emerald-400" />
                  <span>Sell: {formatTime((o as any).suggestedSellFillHours)}</span>
                </div>
              )}
              {(o as any).suggestedTotalFillHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>Total: {formatTime((o as any).suggestedTotalFillHours)}</span>
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

// Subcomponents / helpers
function StatusBadges({ o, riskPct, spreadPctVal, d, s, format }: any) {
  const competitionScore = o.competitionPerHour ?? 0
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${spreadPctVal >= 20 ? 'border-emerald-500/50 text-emerald-400' : spreadPctVal >= 10 ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
        <TrendingUp className="h-3 w-3 mr-1" />
        {format(spreadPctVal, 0)}% spread
      </Badge>
      {riskPct !== undefined && (
        o.riskNote ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 cursor-help ${riskPct >= 50 ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
                <ShieldAlert className="h-3 w-3 mr-1" />
                {riskPct}% risk
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{o.riskNote}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${riskPct >= 50 ? 'border-red-500/50 text-red-400' : 'border-zinc-600 text-zinc-400'}`}>
            <ShieldAlert className="h-3 w-3 mr-1" />
            {riskPct}% risk
          </Badge>
        )
      )}
      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${competitionScore >= 1000 ? 'border-red-500/50 text-red-400' : competitionScore >= 500 ? 'border-amber-500/50 text-amber-400' : 'border-zinc-600 text-zinc-400'}`}>
        <Users className="h-3 w-3 mr-1" />
        {format(competitionScore, 0)} comp
      </Badge>
      <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <BarChart3 className="h-3 w-3" />
        <span>Demand {format(d,0)} · Supply {format(s,0)}</span>
      </div>
    </div>
  )
}

function StepPurchase({ o, query, buy }: any) {
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Target className="h-4 w-4 text-blue-400" />
        <span className="font-medium text-blue-300">Step 1: Calculate Purchase Amount</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center justify-between">
          <span>Suggested amount per hour:</span>
          <span className="font-mono text-blue-300">{format(o.suggestedUnitsPerHour, 0)} units</span>
        </div>
        {query.horizonHours && (
          <div className="flex items-center justify-between">
            <span>For {query.horizonHours}h timeframe:</span>
            <span className="font-mono text-blue-300">{format((o.suggestedUnitsPerHour || 0) * query.horizonHours, 0)} units</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-blue-500/20 pt-1">
          <span>Total investment needed:</span>
          <span className="font-mono text-blue-300">
            {format((query.horizonHours || 1) * Math.round(o.suggestedUnitsPerHour || 0) * buy, 0)} coins
          </span>
        </div>
      </div>
    </div>
  )
}

function StepBuyOrders({ o, buy }: any) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowDown className="h-4 w-4 text-red-400" />
        <span className="font-medium text-red-300">Step 2: Place Buy Orders</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• Go to the Bazaar and search for <span className="font-mono text-red-300">{o.displayName || o.productId}</span></div>
        <div>• Place buy orders at <span className="font-mono text-red-300">{format(buy, 2)} coins</span> each</div>
        <div>• Expected fill time: <span className="text-red-300">{(o as any).suggestedBuyFillHours ? formatTime((o as any).suggestedBuyFillHours) : 'Unknown'}</span></div>
      </div>
    </div>
  )
}

function StepSellOrders({ o, sell, bazaarTaxRate }: any) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowUp className="h-4 w-4 text-emerald-400" />
        <span className="font-medium text-emerald-300">Step 3: Place Sell Orders</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• Once items are bought, place sell orders at <span className="font-mono text-emerald-300">{format(sell, 2)} coins</span> each</div>
        <div>• After {(bazaarTaxRate * 100).toFixed(2)}% tax, you'll receive <span className="font-mono text-emerald-300">{format(sell * (1 - bazaarTaxRate), 2)} coins</span> net</div>
        <div>• Expected fill time: <span className="text-emerald-300">{(o as any).suggestedSellFillHours ? formatTime((o as any).suggestedSellFillHours) : 'Unknown'}</span></div>
        <div>• Total expected time: <span className="text-emerald-300">{(o as any).suggestedTotalFillHours ? formatTime((o as any).suggestedTotalFillHours) : 'Unknown'}</span></div>
      </div>
    </div>
  )
}

function StepProfit({ o, buy, sell, bazaarTaxRate, query }: any) {
  return (
    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-purple-400" />
        <span className="font-medium text-purple-300">Step 4: Profit Setup</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="text-xs text-muted-foreground/70 mb-1 font-medium">Per Item:</div>
        <div className="flex items-center justify-between">
          <span>Gross profit:</span>
          <span className="font-mono text-purple-300">{format(sell - buy, 2)} coins</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Tax deduction ({(bazaarTaxRate * 100).toFixed(2)}%):</span>
          <span className="font-mono text-red-300">-{format(sell * bazaarTaxRate, 2)} coins</span>
        </div>
        <div className="flex items-center justify-between border-t mb-4 border-purple-500/20 pt-1">
          <span>Net profit per item:</span>
          <span className="font-mono text-purple-300">{format((sell * (1 - bazaarTaxRate)) - buy, 2)} coins</span>
        </div>
        <div className="h-3"></div>
        <div className="text-xs text-muted-foreground/70 mb-1 font-medium">Profit Rates:</div>
        <div className="flex items-center justify-between">
          <span>Profit per hour:</span>
          <span className="font-mono text-purple-300">{format((o.reasonableProfitPerHour || 0) * (1 - bazaarTaxRate), 0)} coins/hour</span>
        </div>
        {query.horizonHours && (
          <div className="flex items-center justify-between border-t border-purple-500/20 pt-1">
            <span>Total profit ({query.horizonHours}h):</span>
            <span className="font-mono text-purple-300">{format((o.reasonableProfitPerHour || 0) * query.horizonHours * (1 - bazaarTaxRate), 0)} coins</span>
          </div>
        )}
      </div>
    </div>
  )
}

function RiskWarning({ riskPct }: { riskPct: number }) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <span className="font-medium text-amber-300">Risk Warning</span>
      </div>
      <div className="text-xs text-muted-foreground">
        This flip has a <span className="text-amber-300">{riskPct}% risk score</span>. Market conditions can change quickly - monitor your orders closely.
      </div>
    </div>
  )
}

