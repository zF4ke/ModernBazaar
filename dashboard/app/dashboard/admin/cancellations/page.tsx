"use client"

import { useState } from "react"
import { MessageSquareText, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"

interface Cancellation {
  id: number
  userId: string
  planSlug: string | null
  reason: string | null
  comment: string | null
  createdAt: string | null
}

interface Paged<T> {
  items: T[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

const LIMIT = 50
const fmtDateTime = (s: string | null) => (s ? new Date(s).toLocaleString() : "—")

export default function AdminCancellationsPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const [page, setPage] = useState(0)

  const { data, isLoading, isFetching, refetch } = useBackendQuery<Paged<Cancellation>>(
    `/api/admin/cancellations?page=${page}&limit=${LIMIT}`,
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-cancellations", String(page)] }
  )
  const rows = data?.items ?? []

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to view churn feedback.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquareText className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Churn feedback</h2>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.totalItems} cancellation${data.totalItems === 1 ? "" : "s"}` : "Why people cancelled, newest first"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">When</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || adminLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 5 }).map((__, c) => <TableCell key={c}><Skeleton className="h-4 w-full max-w-[160px]" /></TableCell>)}</TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No cancellations yet.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(r.createdAt)}</TableCell>
                    <TableCell className="text-sm">{r.planSlug ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.reason ?? "—"}</TableCell>
                    <TableCell className="max-w-[420px] whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.comment || <span className="text-muted-foreground/50">—</span>}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-xs text-muted-foreground" title={r.userId}>{r.userId}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {data.page + 1} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!data.hasPrevious || isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-4 w-4 mr-1" />Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!data.hasNext || isFetching} onClick={() => setPage((p) => p + 1)}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
