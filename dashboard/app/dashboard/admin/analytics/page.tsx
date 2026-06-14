"use client"

import { Users, CreditCard, UserMinus, Layers, BarChart3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"

interface AdminAnalytics {
  totalUsers: number
  activeSubscriptions: number
  canceledLast30d: number
  totalPlans: number
  planDistribution: { label: string; count: number }[]
  statusBreakdown: { label: string; count: number }[]
  signupsTrend: { day: string; count: number }[]
}

const titleCase = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : "—")

const PLAN_COLOR: Record<string, string> = {
  free: "bg-zinc-500", flipper: "bg-emerald-500", elite: "bg-blue-500",
}
const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400", past_due: "text-amber-400", canceled: "text-red-400", incomplete: "text-muted-foreground",
}

export default function AdminAnalyticsPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { data, isLoading, isFetching, refetch } = useBackendQuery<AdminAnalytics>(
    "/api/admin/analytics/summary?trendDays=30",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-analytics"], refetchInterval: 30000 }
  )

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to view analytics.</p>
      </div>
    )
  }

  const loading = isLoading || adminLoading
  const planTotal = (data?.planDistribution ?? []).reduce((a, b) => a + b.count, 0) || 1
  const trend = data?.signupsTrend ?? []
  const trendMax = Math.max(1, ...trend.map(t => t.count))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-sm text-muted-foreground">Growth and subscription overview</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-16" /></div></div>
            </div>
          ))
        ) : (
          <>
            <StatusCard title="Total users" icon={Users} value={fmt(data?.totalUsers ?? 0)} iconColorClass="text-blue-400" bgColorClass="bg-blue-500/15" />
            <StatusCard title="Active subs" icon={CreditCard} value={fmt(data?.activeSubscriptions ?? 0)} iconColorClass="text-emerald-400" bgColorClass="bg-emerald-500/15" />
            <StatusCard title="Canceled (30d)" icon={UserMinus} value={fmt(data?.canceledLast30d ?? 0)} iconColorClass="text-red-400" bgColorClass="bg-red-500/15" />
            <StatusCard title="Plans" icon={Layers} value={fmt(data?.totalPlans ?? 0)} iconColorClass="text-violet-400" bgColorClass="bg-violet-500/15" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan distribution */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Plan distribution</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (data?.planDistribution?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          ) : (
            <div className="space-y-3">
              {data!.planDistribution.map((p) => (
                <div key={p.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{titleCase(p.label)}</span>
                    <span className="text-muted-foreground">{fmt(p.count)} · {Math.round((p.count / planTotal) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${PLAN_COLOR[p.label] ?? "bg-primary"}`} style={{ width: `${(p.count / planTotal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Subscription status</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : (data?.statusBreakdown?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {data!.statusBreakdown.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-2.5">
                  <span className={`inline-flex items-center gap-2 text-sm font-medium ${STATUS_COLOR[s.label] ?? "text-foreground"}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />{titleCase(s.label)}
                  </span>
                  <span className="text-sm font-semibold">{fmt(s.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Signups trend */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-1">New subscriptions</h3>
        <p className="text-xs text-muted-foreground mb-4">Last 30 days</p>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : trend.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No signups in this window.</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {trend.map((t) => (
              <div key={t.day} className="group relative flex-1 flex flex-col justify-end" title={`${t.day}: ${t.count}`}>
                <div className="rounded-t bg-blue-500/70 transition-colors group-hover:bg-blue-400" style={{ height: `${Math.max(4, (t.count / trendMax) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
