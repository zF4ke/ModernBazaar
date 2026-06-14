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
import { useToast } from "@/hooks/use-toast"

interface AdminUser {
  userId: string; email: string | null; name: string | null
  planSlug: string; status: string
  currentPeriodEnd: string | null; createdAt: string | null; updatedAt: string | null
  stripeCustomerId: string | null
}
interface Paged<T> { items: T[]; page: number; limit: number; totalItems: number; totalPages: number }

const PLAN_OPTIONS = ["free", "flipper", "elite"]
const PLAN_COLOR: Record<string, string> = {
  free: "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",
  flipper: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  elite: "border-purple-500/40 text-purple-300 bg-purple-500/10",
}
const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400", past_due: "text-amber-400", canceled: "text-red-400", incomplete: "text-muted-foreground",
}
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : "—")
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s)

export default function AdminUsersPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { toast } = useToast()
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

  const mutate = async (path: string, body: object, successMsg: string, key: string) => {
    setBusy(key)
    try {
      await fetchWithBackendUrl(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      await refetch()
      toast({ title: successMsg })
    } catch (e) {
      toast({ title: "Something went wrong", description: (e as Error).message, variant: "destructive" })
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
            <p className="text-sm text-muted-foreground">{data ? `${data.totalItems.toLocaleString()} ${data.totalItems === 1 ? "user" : "users"}` : "Manage plans and access"}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, email or ID…" className="pl-9" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
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
                  <TableRow key={i}>{Array.from({ length: 6 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[160px]" /></TableCell>)}</TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No users found.</TableCell></TableRow>
              ) : (
                items.map((u) => {
                  const rowBusy = busy?.startsWith(u.userId)
                  return (
                    <TableRow key={u.userId} className={rowBusy ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[220px]">{u.name || <span className="italic text-muted-foreground">No name</span>}</div>
                          <div className="truncate max-w-[240px] text-xs text-muted-foreground">{u.email || "No email on file"}</div>
                          <div className="truncate max-w-[240px] font-mono text-[10px] text-muted-foreground/50" title={u.userId}>{u.userId}</div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${PLAN_COLOR[u.planSlug] ?? "border-zinc-600 text-zinc-400"}`}>{titleCase(u.planSlug)}</Badge></TableCell>
                      <TableCell><span className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[u.status] ?? "text-foreground"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{titleCase(u.status)}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(u.currentPeriodEnd)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Select value={u.planSlug} disabled={rowBusy}
                            onValueChange={(v) => v !== u.planSlug && mutate("/api/admin/users/plan", { userId: u.userId, planSlug: v }, `${u.name || u.email || "User"} set to ${titleCase(v)}`, u.userId + "-plan")}>
                            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PLAN_OPTIONS.map((p) => <SelectItem key={p} value={p} className="text-xs">{titleCase(p)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" className="h-8" disabled={rowBusy} title="Extend this user's access by 30 days"
                            onClick={() => mutate("/api/admin/users/extend", { userId: u.userId, days: 30 }, `Extended ${u.name || u.email || "user"} by 30 days`, u.userId + "-ext")}>
                            <CalendarPlus className="h-3.5 w-3.5 mr-1" />+30d
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
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
