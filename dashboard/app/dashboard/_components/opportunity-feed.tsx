"use client"

import Link from "next/link"
import type { FlipOpportunity } from "@/types/strategies"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight } from "lucide-react"

const compact = (n?: number) => {
  if (n === undefined || !Number.isFinite(n)) return "—"
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return Math.round(n).toString()
}

const pct = (n?: number) => (n !== undefined && Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—")

export function OpportunityFeed({ items, isLoading }: { items: FlipOpportunity[]; isLoading: boolean }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {isLoading ? (
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No standout flips this minute. The market refreshes every minute, so check back shortly.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {items.map((o, i) => {
            const buy = o.buyOrderPrice ?? o.instantSellPrice ?? 0
            const sell = o.sellOrderPrice ?? o.instantBuyPrice ?? 0
            return (
              <Link
                key={o.productId}
                href={`/dashboard/bazaar-items/${o.productId}`}
                className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-semibold text-emerald-400">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{o.displayName || o.productId}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    Buy {compact(buy)} <span className="text-muted-foreground/50">→</span> Sell {compact(sell)} · {pct(o.spreadPct)} spread
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-400">+{compact(o.reasonableProfitPerHour)}</div>
                  <div className="text-[11px] text-muted-foreground">per hour</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
