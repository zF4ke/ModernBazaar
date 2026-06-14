"use client"

import { useState } from "react"
import { Users as UsersIcon, RefreshCw, Search, ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { fetchWithBackendUrl } from "@/lib/api"
import { useDebounce } from "@/hooks/use-debounce"

interface AdminUser {
  userId: string; planSlug: string; status: string
  currentPeriodEnd: string | null; createdAt: string | null; updatedAt: string | null
  stripeCustomerId: string | null
}
interface Paged<T> { items: T[]; page: number; limit: number; totalItems: number; totalPages: number }

const PLAN_OPTIONS = ["free", "flipper", "elite"]
const PLAN_COLOR: Record<string, string> = {
  free: "border-zinc-600 text-zinc-300", flipper: "border-emerald-500/40 text-emerald-400", elite: "border-blue-500/40 text-blue-400",
}
const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400", past_due: "text-amber-400", canceled: "text-red-400", incomplete: "text-muted-foreground",
}
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s)

export default function AdminUsersPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const q = useDebounce(search, 300)

  const params = new URLSearchParams({ page: String(page), limit: "25" })
  if (q) params.set("q", q)
  const { data, isLoading, isFetching, refetch } = useBackendQuery<Paged<AdminUser>>(
    `/api/admin/users?${params.toString()}`,
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-users", q, String(page)] }
  )

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const mutate = async (path: string, body: object) => {
    setBusy(JSON.stringify(body))
    try {
      await fetchWithBackendUrl(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      await refetch()
    } finally {
      setBusy(null)
    }
  }

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to manage users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-sm text-muted-foreground">{data ? `${data.totalItems.toLocaleString()} subscribers` : "Manage plans and access"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by user id…" className="pl-9" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || adminLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[140px]" /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-mono text-xs max-w-[220px] truncate" title={u.userId}>{u.userId}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${PLAN_COLOR[u.planSlug] ?? "border-zinc-600 text-zinc-400"}`}>{titleCase(u.planSlug)}</Badge></TableCell>
                    <TableCell><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[u.status] ?? "text-foreground"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{titleCase(u.status)}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(u.currentPeriodEnd)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Select value={u.planSlug} onValueChange={(v) => mutate("/api/admin/users/plan", { userId: u.userId, planSlug: v })}>
                          <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PLAN_OPTIONS.map((p) => <SelectItem key={p} value={p} className="text-xs">{titleCase(p)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="h-8" disabled={busy !== null}
                          onClick={() => mutate("/api/admin/users/extend", { userId: u.userId, days: 30 })}>
                          <CalendarPlus className="h-3.5 w-3.5 mr-1" />+30d
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-3">
            <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" />Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
