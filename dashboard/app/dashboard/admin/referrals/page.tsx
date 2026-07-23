"use client"

import { useMemo, useState } from "react"
import {
  Share2, RefreshCw, Plus, Copy, Check, Link2, Trash2,
  MousePointerClick, Users, Wallet, CalendarClock, BadgeDollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusCard } from "@/components/status-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { fetchWithBackendUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface CreatorOverview {
  id: number
  code: string
  ownerUserId: string
  createdAt: string | null
  clicks: number
  subscribers: number
  activeSubscribers: number
  activeLast7Days: number
  activeByPlan: Record<string, number>
  conversionRatePct: number | null
  estMonthlyRevenueCents: number
  estMonthlyOwedCents: number
  pendingPayoutCents: number
  paidToDateCents: number
  lastReferredActivity: string | null
}

interface Payout {
  id: number
  code: string
  amountCents: number
  periodStart: string | null
  periodEnd: string | null
  status: string
  note: string | null
  createdAt: string | null
  paidAt: string | null
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")
const fmtNum = (n: number) => n.toLocaleString("en-US")
const PLAN_DOT: Record<string, string> = { flipper: "bg-emerald-500", elite: "bg-blue-500" }

const relTime = (s: string | null) => {
  if (!s) return "—"
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 30 ? `${days}d ago` : fmtDate(s)
}

/** Payouts are due NET-15 after the period ends (see docs/CREATORS.md). */
const dueDate = (p: Payout): Date | null => {
  const base = p.periodEnd ?? p.createdAt
  if (!base) return null
  const d = new Date(base)
  d.setDate(d.getDate() + 15)
  return d
}

/** First and last day of the previous calendar month (the default payout period). */
const previousMonthPeriod = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { start: iso(start), end: iso(end) }
}

export default function AdminReferralsPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [userId, setUserId] = useState("")
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  // Record-payout form state (opened from a creator row, prefilled with what's owed)
  const [payoutFor, setPayoutFor] = useState<CreatorOverview | null>(null)
  const [payoutAmount, setPayoutAmount] = useState("")
  const [payoutNote, setPayoutNote] = useState("")

  const overviewQ = useBackendQuery<CreatorOverview[]>(
    "/api/admin/referrals/overview",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-referrals-overview"] }
  )
  const payoutsQ = useBackendQuery<Payout[]>(
    "/api/admin/referrals/payouts",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-referrals-payouts"] }
  )

  const creators = overviewQ.data ?? []
  const payouts = payoutsQ.data ?? []
  const loading = overviewQ.isLoading || adminLoading
  const fetching = overviewQ.isFetching || payoutsQ.isFetching

  const totals = useMemo(() => ({
    clicks: creators.reduce((s, c) => s + c.clicks, 0),
    active: creators.reduce((s, c) => s + c.activeSubscribers, 0),
    revenue: creators.reduce((s, c) => s + c.estMonthlyRevenueCents, 0),
    owed: creators.reduce((s, c) => s + c.estMonthlyOwedCents, 0),
    pending: creators.reduce((s, c) => s + c.pendingPayoutCents, 0),
  }), [creators])

  const pendingPayouts = useMemo(
    () => payouts.filter(p => p.status !== "paid")
      .sort((a, b) => (dueDate(a)?.getTime() ?? 0) - (dueDate(b)?.getTime() ?? 0)),
    [payouts]
  )
  const paidPayouts = useMemo(() => payouts.filter(p => p.status === "paid"), [payouts])

  const refetchAll = () => { overviewQ.refetch(); payoutsQ.refetch() }

  const refLink = (c: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/r/${c}` : `/r/${c}`

  const copyVal = (key: string, value: string) => {
    navigator.clipboard?.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied((v) => (v === key ? null : v)), 1500)
  }

  const create = async () => {
    if (!userId.trim()) return
    setBusy(true)
    try {
      await fetchWithBackendUrl("/api/admin/referrals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), code: code.trim() || null }),
      })
      setUserId(""); setCode("")
      refetchAll()
      toast({ title: "Referral code ready" })
    } catch (e) {
      toast({ title: "Couldn't create code", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: CreatorOverview) => {
    if (!window.confirm(`Delete referral code ${c.code}? This can't be undone.`)) return
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/referrals/${c.id}`, { method: "DELETE" })
      refetchAll()
    } finally {
      setBusy(false)
    }
  }

  const openPayoutForm = (c: CreatorOverview) => {
    setPayoutFor(c)
    setPayoutAmount((c.estMonthlyOwedCents / 100).toFixed(2))
    setPayoutNote("")
  }

  const recordPayout = async () => {
    if (!payoutFor) return
    const cents = Math.round(parseFloat(payoutAmount) * 100)
    if (!Number.isFinite(cents) || cents <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const period = previousMonthPeriod()
      await fetchWithBackendUrl("/api/admin/referrals/payouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: payoutFor.code, amountCents: cents,
          periodStart: period.start, periodEnd: period.end,
          note: payoutNote.trim() || null,
        }),
      })
      setPayoutFor(null)
      refetchAll()
      toast({ title: `Payout recorded for ${payoutFor.code}`, description: "It's now pending in the ledger, due in 15 days." })
    } catch (e) {
      toast({ title: "Couldn't record payout", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const markPaid = async (p: Payout) => {
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/referrals/payouts/${p.id}`, { method: "POST" })
      refetchAll()
      toast({ title: `${p.code} marked paid`, description: money(p.amountCents) })
    } finally {
      setBusy(false)
    }
  }

  const deletePayout = async (p: Payout) => {
    if (!window.confirm(`Delete this ${money(p.amountCents)} payout entry for ${p.code}?`)) return
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/referrals/payouts/${p.id}`, { method: "DELETE" })
      refetchAll()
    } finally {
      setBusy(false)
    }
  }

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to manage referrals.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Creator program</h2>
            <p className="text-sm text-muted-foreground">
              {overviewQ.data
                ? `${creators.length} creator${creators.length === 1 ? "" : "s"} · ${fmtNum(totals.clicks)} clicks · ${fmtNum(totals.active)} active subs`
                : "Referral links, conversion tracking and payouts"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={fetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Program totals */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-xl" /><div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-16" /></div></div>
            </div>
          ))
        ) : (
          <>
            <StatusCard title="Link clicks" icon={MousePointerClick} value={fmtNum(totals.clicks)} iconColorClass="text-blue-400" bgColorClass="bg-blue-500/15" />
            <StatusCard title="Referred active subs" icon={Users} value={fmtNum(totals.active)} iconColorClass="text-emerald-400" bgColorClass="bg-emerald-500/15" />
            <StatusCard title="Est. monthly revenue" icon={BadgeDollarSign} value={money(totals.revenue)} iconColorClass="text-violet-400" bgColorClass="bg-violet-500/15" />
            <StatusCard title="Owed to creators / mo" icon={Wallet} value={money(totals.owed)} iconColorClass="text-amber-400" bgColorClass="bg-amber-500/15" />
          </>
        )}
      </div>

      {/* Mint */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-50 bg-violet-500/20" />
        <div className="relative z-10">
          <h3 className="mb-3 text-sm font-medium">Add a creator</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">User ID (Auth0 sub)</label>
              <Input placeholder="google-oauth2|123…" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-72 font-mono text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Custom code (optional)</label>
              <Input placeholder="e.g. ALEX" value={code} onChange={(e) => setCode(e.target.value)} className="w-40 font-mono uppercase" />
            </div>
            <Button onClick={create} disabled={busy || !userId.trim()} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />Create
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Give creators a memorable code (like their handle) — their link becomes <span className="font-mono">/r/CODE</span>.
            Clicks are tracked automatically; conversions count on the referred user&apos;s first paid subscription.
          </p>
        </div>
      </div>

      {/* Creators table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Signups</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead>Active subs</TableHead>
                <TableHead className="text-right">Active 7d</TableHead>
                <TableHead className="text-right">Revenue / mo</TableHead>
                <TableHead className="text-right">Owed / mo</TableHead>
                <TableHead className="text-right">Paid to date</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 12 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[100px]" /></TableCell>)}</TableRow>
                ))
              ) : creators.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="py-10 text-center text-sm text-muted-foreground">No creators yet. Add the first one above.</TableCell></TableRow>
              ) : (
                creators.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <button onClick={() => copyVal("code:" + c.code, c.code)} className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-sm font-semibold hover:text-violet-400" title={`Owner: ${c.ownerUserId}`}>
                        {c.code}
                        {copied === "code:" + c.code ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => copyVal("link:" + c.code, refLink(c.code))} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" title={refLink(c.code)}>
                        {copied === "link:" + c.code ? <><Check className="h-3.5 w-3.5 text-emerald-400" />Copied</> : <><Link2 className="h-3.5 w-3.5" />/r/{c.code}</>}
                      </button>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtNum(c.clicks)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtNum(c.subscribers)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {c.conversionRatePct != null ? `${c.conversionRatePct.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold">{fmtNum(c.activeSubscribers)}</span>
                        {Object.entries(c.activeByPlan ?? {}).map(([plan, n]) => (
                          <span key={plan} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${PLAN_DOT[plan] ?? "bg-zinc-500"}`} />{n} {plan}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmtNum(c.activeLast7Days)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{money(c.estMonthlyRevenueCents)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-amber-400">{money(c.estMonthlyOwedCents)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">{money(c.paidToDateCents)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{relTime(c.lastReferredActivity)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" className="h-8 cursor-pointer text-xs" disabled={busy || c.estMonthlyOwedCents === 0} title="Record a payout for this creator" onClick={() => openPayoutForm(c)}>
                        <Wallet className="h-3.5 w-3.5 mr-1" />Pay
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-red-400" disabled={busy} title="Delete referral code" onClick={() => remove(c)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Record payout form */}
      {payoutFor && (
        <div className="rounded-xl border border-amber-500/30 bg-card p-5">
          <h3 className="mb-1 text-sm font-medium">Record payout for <span className="font-mono text-amber-400">{payoutFor.code}</span></h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Prefilled with this month&apos;s estimated 30% share ({money(payoutFor.estMonthlyOwedCents)}). Period defaults to last calendar month; due 15 days after it ends.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount (USD)</label>
              <Input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="w-32 font-mono" inputMode="decimal" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
              <Input placeholder="e.g. PayPal, June share" value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} className="w-72" />
            </div>
            <Button onClick={recordPayout} disabled={busy} className="cursor-pointer">Record payout</Button>
            <Button variant="ghost" onClick={() => setPayoutFor(null)} disabled={busy} className="cursor-pointer">Cancel</Button>
          </div>
        </div>
      )}

      {/* Payout calendar / ledger */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pending, ordered by due date */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold">Pending payouts</h3>
            {totals.pending > 0 && <span className="ml-auto font-mono text-sm text-amber-400">{money(totals.pending)}</span>}
          </div>
          {payoutsQ.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : pendingPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pending. Record a payout from a creator row when their monthly share is due.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {pendingPayouts.map((p) => {
                const due = dueDate(p)
                const overdue = due != null && due.getTime() < Date.now()
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-sm font-semibold">{p.code}</span>
                        <span className="font-mono text-sm">{money(p.amountCents)}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.periodStart ? `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}` : `Recorded ${fmtDate(p.createdAt)}`}
                        {p.note ? ` · ${p.note}` : ""}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2 whitespace-nowrap">
                      <span className={`text-xs ${overdue ? "font-medium text-red-400" : "text-muted-foreground"}`}>
                        {due ? (overdue ? `Overdue · was due ${due.toLocaleDateString()}` : `Due ${due.toLocaleDateString()}`) : ""}
                      </span>
                      <Button variant="outline" size="sm" className="h-7 cursor-pointer text-xs" disabled={busy} onClick={() => markPaid(p)}>
                        <Check className="h-3 w-3 mr-1" />Paid
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-red-400" disabled={busy} title="Delete entry" onClick={() => deletePayout(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Paid history */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold">Payment history</h3>
          </div>
          {payoutsQ.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paidPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts made yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {paidPayouts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-sm font-semibold">{p.code}</span>
                      <span className="font-mono text-sm">{money(p.amountCents)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.periodStart ? `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}` : ""}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">Paid {fmtDate(p.paidAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
