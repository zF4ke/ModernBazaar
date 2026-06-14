"use client"

import { useState } from "react"
import { Users as UsersIcon, RefreshCw, Search, ChevronLeft, ChevronRight, MoreHorizontal, Copy, Trash2, Mail, Layers, Check, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
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
const relativeExpiry = (s: string | null) => {
  if (!s) return { label: "—", tone: "text-muted-foreground" }
  const ms = new Date(s).getTime() - Date.now()
  if (ms <= 0) return { label: "expired", tone: "text-red-400" }
  const days = Math.ceil(ms / 86_400_000)
  if (days <= 7) return { label: `in ${days} day${days === 1 ? "" : "s"}`, tone: "text-amber-400" }
  if (days < 45) return { label: `in ${days} days`, tone: "text-muted-foreground" }
  return { label: `in ${Math.round(days / 30)} months`, tone: "text-muted-foreground" }
}
const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s)

export default function AdminUsersPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState("userId")
  const [dir, setDir] = useState<"asc" | "desc">("asc")
  const q = useDebounce(search, 300)

  const params = new URLSearchParams({ page: String(page), limit: "25", sortBy, dir })
  if (q) params.set("q", q)
  const { data, isLoading, isFetching, refetch } = useBackendQuery<Paged<AdminUser>>(
    `/api/admin/users?${params.toString()}`,
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-users", q, String(page), sortBy, dir] }
  )

  const toggleSort = (field: string) => {
    if (field === sortBy) setDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortBy(field); setDir("asc") }
    setPage(0)
  }

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

  const copyVal = (value: string, label: string) => {
    navigator.clipboard?.writeText(value)
    toast({ title: `${label} copied` })
  }

  const remove = async (u: AdminUser) => {
    const who = u.name || u.email || u.userId
    if (!window.confirm(`Delete ${who}? This revokes their access and removes their record. They'll be re-created as a free user only if they sign in again.`)) return
    await mutate("/api/admin/users/delete", { userId: u.userId }, `${who} removed`, u.userId + "-del")
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
                <SortHead field="userId" sortBy={sortBy} dir={dir} onSort={toggleSort}>User</SortHead>
                <SortHead field="planSlug" sortBy={sortBy} dir={dir} onSort={toggleSort}>Plan</SortHead>
                <SortHead field="status" sortBy={sortBy} dir={dir} onSort={toggleSort}>Status</SortHead>
                <SortHead field="currentPeriodEnd" sortBy={sortBy} dir={dir} onSort={toggleSort}>Expires</SortHead>
                <SortHead field="createdAt" sortBy={sortBy} dir={dir} onSort={toggleSort}>Joined</SortHead>
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
                      <TableCell className={`text-sm ${relativeExpiry(u.currentPeriodEnd).tone}`} title={u.currentPeriodEnd ? new Date(u.currentPeriodEnd).toLocaleString() : "No expiry"}>
                        {relativeExpiry(u.currentPeriodEnd).label}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={rowBusy}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="truncate">{u.name || u.email || "User"}</DropdownMenuLabel>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger><Layers className="h-4 w-4 mr-2" />Change plan</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {PLAN_OPTIONS.map((p) => (
                                  <DropdownMenuItem key={p} disabled={p === u.planSlug}
                                    onClick={() => mutate("/api/admin/users/plan", { userId: u.userId, planSlug: p }, `${u.name || u.email || "User"} set to ${titleCase(p)}`, u.userId + "-plan")}>
                                    {titleCase(p)}{p === u.planSlug && <Check className="ml-auto h-3.5 w-3.5 text-emerald-400" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => copyVal(u.userId, "User ID")}><Copy className="h-4 w-4 mr-2" />Copy user ID</DropdownMenuItem>
                            {u.email && <DropdownMenuItem onClick={() => copyVal(u.email!, "Email")}><Mail className="h-4 w-4 mr-2" />Copy email</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400 focus:text-red-400" onClick={() => remove(u)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

function SortHead({ field, sortBy, dir, onSort, children }: { field: string; sortBy: string; dir: "asc" | "desc"; onSort: (f: string) => void; children: React.ReactNode }) {
  const active = sortBy === field
  return (
    <TableHead>
      <button onClick={() => onSort(field)} className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
        {children}
        {active
          ? (dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)
          : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
      </button>
    </TableHead>
  )
}
