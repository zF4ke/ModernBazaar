"use client"

import { useState } from "react"
import { Shield, RefreshCw, Save, Plus, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { fetchWithBackendUrl } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Plan { slug: string; name: string; stripePriceId: string | null; featuresJson: string; active: boolean }

const KNOWN = [
  { slug: "free",    name: "Free",    badge: "border-zinc-500/40 text-zinc-300 bg-zinc-500/10",       paid: false, blurb: "Live prices, full catalog, favorites. The free taste." },
  { slug: "flipper", name: "Flipper", badge: "border-blue-500/40 text-blue-300 bg-blue-500/10",       paid: true,  blurb: "$9.99/mo · the Bazaar Flipping finder." },
  { slug: "elite",   name: "Elite",   badge: "border-purple-500/40 text-purple-300 bg-purple-500/10", paid: true,  blurb: "$25.99/mo · everything in Flipper plus Bazaar Manipulation." },
]
const DEFAULT_FEATURES = '{"limits":{"maxItemsPerPage":50}}'

export default function AdminPlansPage() {
  const { hasAdminAccess, loading: adminLoading } = useAdminAccess()
  const { toast } = useToast()
  const { data, isLoading, isFetching, refetch } = useBackendQuery<Plan[]>(
    "/api/admin/plans", { enabled: hasAdminAccess, requireAuth: true, queryKey: ["admin-plans"] }
  )
  const plans = data ?? []
  const get = (slug: string) => plans.find((p) => p.slug === slug)

  const [variant, setVariant] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const save = async (slug: string, patch: object, msg: string) => {
    setBusy(slug)
    try {
      await fetchWithBackendUrl(`/api/admin/plans/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) })
      await refetch()
      toast({ title: msg })
    } catch (e) {
      toast({ title: "Couldn't save", description: (e as Error).message, variant: "destructive" })
    } finally { setBusy(null) }
  }

  const createPlan = async (slug: string, name: string) => {
    setBusy(slug)
    try {
      await fetchWithBackendUrl("/api/admin/plans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, stripePriceId: null, featuresJson: DEFAULT_FEATURES, active: true }),
      })
      await refetch()
      toast({ title: `${name} plan created` })
    } catch (e) {
      toast({ title: "Couldn't create plan", description: (e as Error).message, variant: "destructive" })
    } finally { setBusy(null) }
  }

  if (!adminLoading && !hasAdminAccess) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <h2 className="text-xl font-semibold mb-1">Admins only</h2>
        <p className="text-sm text-muted-foreground">You need the manage:plans permission to manage plans.</p>
      </div>
    )
  }

  const loading = isLoading || adminLoading

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-muted-foreground" />
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-sm text-muted-foreground">Map each paid plan to its Lemon Squeezy variant and toggle availability.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          KNOWN.map((k) => (
            <div key={k.slug} className="rounded-xl border bg-card p-5"><Skeleton className="h-5 w-24 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-9 w-full" /></div>
          ))
        ) : (
          KNOWN.map((k) => {
            const p = get(k.slug)
            const vid = variant[k.slug] ?? (p?.stripePriceId ?? "")
            const dirty = p != null && vid !== (p.stripePriceId ?? "")
            const rowBusy = busy === k.slug
            return (
              <div key={k.slug} className="flex flex-col rounded-xl border bg-card p-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${k.badge}`}>{k.name}</span>
                  {p ? (
                    p.active
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Active</span>
                      : <span className="text-xs text-muted-foreground">Inactive</span>
                  ) : <span className="text-xs text-amber-400">Not set up</span>}
                </div>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">{k.blurb}</p>

                {!p ? (
                  <Button size="sm" disabled={rowBusy} onClick={() => createPlan(k.slug, k.name)}>
                    <Plus className="h-4 w-4 mr-1.5" />Create {k.name} plan
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {k.paid ? (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Lemon Squeezy variant ID</label>
                        <div className="mt-1 flex gap-2">
                          <Input value={vid} placeholder="e.g. 123456" className="h-9 font-mono text-sm"
                            onChange={(e) => setVariant((v) => ({ ...v, [k.slug]: e.target.value }))} />
                          <Button size="sm" className="h-9" disabled={!dirty || rowBusy}
                            onClick={() => save(k.slug, { stripePriceId: vid.trim() || null }, `${k.name} variant saved`)}>
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No variant needed (free).</p>
                    )}
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm">Available to users</span>
                      <Switch checked={p.active} disabled={rowBusy}
                        onCheckedChange={(val) => save(k.slug, { active: val }, `${k.name} ${val ? "activated" : "deactivated"}`)} />
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {!loading && plans.some((p) => !KNOWN.find((k) => k.slug === p.slug)) && (
        <p className="text-xs text-muted-foreground">
          Other plans in the database: {plans.filter((p) => !KNOWN.find((k) => k.slug === p.slug)).map((p) => p.slug).join(", ")}
        </p>
      )}
    </div>
  )
}
