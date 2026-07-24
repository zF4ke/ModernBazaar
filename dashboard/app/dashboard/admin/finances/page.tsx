"use client"

import { Wallet, RefreshCw, Server, TrendingUp, Users, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"

/**
 * Finances: the cost model as a live page (replaces the spreadsheet).
 * Fixed costs are constants below — edit them here when a bill changes.
 * Revenue numbers come from the live analytics endpoint.
 */
const FIXED_COSTS = [
  { name: "DigitalOcean droplet", monthly: 12.0, note: "API + Postgres + monitoring" },
  { name: "Domain (modernbazaar.dev)", monthly: 1.0, note: "$12/yr at Porkbun" },
  { name: "Vercel", monthly: 0.0, note: "Hobby — set to 20 when moving to Pro" },
  { name: "Auth0", monthly: 0.0, note: "Free to ~25k MAU (~3,500 paying users)" },
  { name: "Backups", monthly: 0.0, note: "Local only, by choice" },
]
const STRIPE_PCT = 0.07        // blended MoR fee — verify against a real month
const STRIPE_FIXED = 0.5       // per charge
const CREATOR_SHARE = 0.3      // of creator-referred revenue only
const PRICES: Record<string, number> = { flipper: 5.99, elite: 25.99 }

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

interface AdminAnalytics {
  totalUsers: number
  activeSubscriptions: number
  planDistribution: { label: string; count: number }[]
}

export default function AdminFinancesPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { data, isLoading, isFetching, refetch } = useBackendQuery<AdminAnalytics>(
    "/api/admin/analytics/summary?trendDays=30",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-analytics"] }
  )

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to view finances.</p>
      </div>
    )
  }

  const loading = isLoading || adminLoading
  const fixedTotal = FIXED_COSTS.reduce((s, c) => s + c.monthly, 0)

  // Rough MRR from plan distribution (latest sub per user; includes canceled-in-period).
  const mrr = (data?.planDistribution ?? []).reduce(
    (s, p) => s + (PRICES[p.label] ?? 0) * p.count, 0)
  const paying = (data?.planDistribution ?? []).reduce(
    (s, p) => s + (PRICES[p.label] ? p.count : 0), 0)
  const netEstimate = mrr * (1 - STRIPE_PCT) - paying * STRIPE_FIXED - fixedTotal
  const breakEvenUsers = Math.ceil(fixedTotal / (5.99 * (1 - STRIPE_PCT) - STRIPE_FIXED))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Finances</h2>
            <p className="text-sm text-muted-foreground">Fixed costs, live revenue, break-even</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-16" /></div></div>
            </div>
          ))
        ) : (
          <>
            <StatusCard title="Fixed costs / mo" icon={Server} value={money(fixedTotal)} iconColorClass="text-blue-400" bgColorClass="bg-blue-500/15" />
            <StatusCard title="Paying users" icon={Users} value={String(paying)} iconColorClass="text-emerald-400" bgColorClass="bg-emerald-500/15" />
            <StatusCard title="Est. MRR" icon={TrendingUp} value={money(mrr)} iconColorClass="text-violet-400" bgColorClass="bg-violet-500/15" />
            <StatusCard title="Est. net / mo" icon={Scale} value={money(netEstimate)} iconColorClass={netEstimate >= 0 ? "text-emerald-400" : "text-amber-400"} bgColorClass={netEstimate >= 0 ? "bg-emerald-500/15" : "bg-amber-500/15"} />
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fixed cost</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-right">Yearly</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FIXED_COSTS.map((c) => (
              <TableRow key={c.name}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-right font-mono">{money(c.monthly)}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{money(c.monthly * 12)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.note}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-mono font-semibold">{money(fixedTotal)}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-muted-foreground">{money(fixedTotal * 12)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">Worst-case month. Break-even ≈ {breakEvenUsers} Flipper subs.</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Variable costs never precede revenue: Stripe takes ~{Math.round(STRIPE_PCT * 100)}% + $0.50 per charge
        (verify the blended rate against a real month), creators earn {Math.round(CREATOR_SHARE * 100)}% of
        revenue their links generate — paid after it arrives. Est. MRR uses list prices over the latest plan
        per user; reconcile real money in the Stripe dashboard.
      </p>
    </div>
  )
}
