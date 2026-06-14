"use client"

import { useState } from "react"
import { Ticket, RefreshCw, Plus, Copy, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { fetchWithBackendUrl } from "@/lib/api"

interface Discount {
  id: number; code: string; percentOff: number; planSlug: string | null
  maxRedemptions: number | null; redemptions: number; expiresAt: string | null
  active: boolean; redeemable: boolean; createdAt: string | null
}

const ANY_PLAN = "__any__"
const PLAN_OPTIONS = ["flipper", "elite"]
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")

export default function AdminDiscountsPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // create form
  const [percent, setPercent] = useState("20")
  const [plan, setPlan] = useState<string>(ANY_PLAN)
  const [maxR, setMaxR] = useState("")
  const [days, setDays] = useState("")
  const [custom, setCustom] = useState("")

  const { data, isLoading, isFetching, refetch } = useBackendQuery<Discount[]>(
    "/api/admin/discounts",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-discounts"] }
  )
  const codes = data ?? []

  const create = async () => {
    setBusy(true)
    try {
      await fetchWithBackendUrl("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          percentOff: Number(percent) || 0,
          planSlug: plan === ANY_PLAN ? null : plan,
          maxRedemptions: maxR ? Number(maxR) : null,
          expiresInDays: days ? Number(days) : null,
          code: custom.trim() || null,
        }),
      })
      setCustom(""); setMaxR(""); setDays("")
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (d: Discount) => {
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/discounts/${d.id}/active`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !d.active }),
      })
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (d: Discount) => {
    if (!window.confirm(`Delete code ${d.code}? This can't be undone.`)) return
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/discounts/${d.id}`, { method: "DELETE" })
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500)
  }

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to manage discounts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Discount codes</h2>
            <p className="text-sm text-muted-foreground">{data ? `${codes.length} code${codes.length === 1 ? "" : "s"}` : "Generate and manage promo codes"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Generate */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-50 bg-blue-500/20" />
        <div className="relative z-10">
          <h3 className="mb-3 text-sm font-medium">Generate a code</h3>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="% off">
              <Input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className="w-24" />
            </Field>
            <Field label="Plan">
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_PLAN}>Any plan</SelectItem>
                  {PLAN_OPTIONS.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max uses">
              <Input type="number" min={1} placeholder="∞" value={maxR} onChange={(e) => setMaxR(e.target.value)} className="w-24" />
            </Field>
            <Field label="Expires (days)">
              <Input type="number" min={1} placeholder="never" value={days} onChange={(e) => setDays(e.target.value)} className="w-28" />
            </Field>
            <Field label="Custom code (optional)">
              <Input placeholder="auto" value={custom} onChange={(e) => setCustom(e.target.value)} className="w-40 font-mono uppercase" />
            </Field>
            <Button onClick={create} disabled={busy}>
              <Plus className="h-4 w-4 mr-1" />Generate
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || adminLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 7 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>)}</TableRow>
                ))
              ) : codes.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No codes yet. Generate one above.</TableCell></TableRow>
              ) : (
                codes.map((d) => (
                  <TableRow key={d.id} className={d.active ? "" : "opacity-50"}>
                    <TableCell>
                      <button onClick={() => copy(d.code)} className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-blue-400" title="Copy">
                        {d.code}
                        {copied === d.code ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell><span className="font-semibold text-blue-400">{d.percentOff}%</span></TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.planSlug ? titleCase(d.planSlug) : "Any"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.redemptions}{d.maxRedemptions ? ` / ${d.maxRedemptions}` : ""}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(d.expiresAt)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${d.redeemable ? "text-emerald-400" : "text-muted-foreground"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />{d.redeemable ? "Active" : d.active ? "Used up / expired" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8" disabled={busy} onClick={() => toggle(d)}>
                          {d.active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" disabled={busy} title="Delete code permanently" onClick={() => remove(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}
