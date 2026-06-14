"use client"

import { useState } from "react"
import { Share2, RefreshCw, Plus, Copy, Check, Link2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { fetchWithBackendUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Referral {
  id: number; userId: string; code: string; conversions: number; createdAt: string | null
}

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")
const refLink = (code: string) => (typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`)

export default function AdminReferralsPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [userId, setUserId] = useState("")
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useBackendQuery<Referral[]>(
    "/api/admin/referrals",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-referrals"] }
  )
  const rows = data ?? []
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0)

  const create = async () => {
    if (!userId.trim()) return
    setBusy(true)
    try {
      await fetchWithBackendUrl("/api/admin/referrals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), code: code.trim() || null }),
      })
      setUserId(""); setCode("")
      await refetch()
      toast({ title: "Referral code ready" })
    } catch (e) {
      toast({ title: "Couldn't create code", description: (e as Error).message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (r: Referral) => {
    if (!window.confirm(`Delete referral code ${r.code}? This can't be undone.`)) return
    setBusy(true)
    try {
      await fetchWithBackendUrl(`/api/admin/referrals/${r.id}`, { method: "DELETE" })
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  const copyVal = (key: string, value: string) => {
    navigator.clipboard?.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500)
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Referrals</h2>
            <p className="text-sm text-muted-foreground">{data ? `${rows.length} code${rows.length === 1 ? "" : "s"} · ${totalConversions} conversion${totalConversions === 1 ? "" : "s"}` : "Mint referral codes and track conversions"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Mint */}
      <div className="relative overflow-hidden rounded-xl border bg-card p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-50 bg-violet-500/20" />
        <div className="relative z-10">
          <h3 className="mb-3 text-sm font-medium">Create a referral code</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">User ID (Auth0 sub)</label>
              <Input placeholder="google-oauth2|123…" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-72 font-mono text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Custom code (optional)</label>
              <Input placeholder="e.g. ALEX" value={code} onChange={(e) => setCode(e.target.value)} className="w-40 font-mono uppercase" />
            </div>
            <Button onClick={create} disabled={busy || !userId.trim()}>
              <Plus className="h-4 w-4 mr-1" />Create
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Give creators a memorable code (like their handle). Conversions count on the referred user&apos;s first paid subscription.</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Share link</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || adminLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[140px]" /></TableCell>)}</TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No referral codes yet.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <button onClick={() => copyVal("code:" + r.code, r.code)} className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-violet-400" title="Copy code">
                        {r.code}
                        {copied === "code:" + r.code ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button onClick={() => copyVal("link:" + r.code, refLink(r.code))} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground" title={refLink(r.code)}>
                        {copied === "link:" + r.code ? <><Check className="h-3.5 w-3.5 text-emerald-400" />Copied</> : <><Link2 className="h-3.5 w-3.5" />Copy link</>}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs" title={r.userId}>{r.userId}</TableCell>
                    <TableCell><span className="font-semibold text-violet-400">{r.conversions}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" disabled={busy} title="Delete referral code" onClick={() => remove(r)}>
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
    </div>
  )
}
