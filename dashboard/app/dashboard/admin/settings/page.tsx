"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, Clock, Trash2, Server, Wifi, Activity, Settings, Power, Check } from "lucide-react"

const BACKEND_PRESETS = [
  { label: "Local", url: "http://localhost:8080", disabled: false, note: "your machine" },
  { label: "Production", url: "", disabled: true, note: "not deployed yet" },
]
import { useToast } from "@/hooks/use-toast"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { StatusCard } from "@/components/status-card"
import { fetchWithBackendUrl } from "@/lib/api"
import type { SystemHealth, SystemMetrics } from "@/types/metrics"
import { useAdminAccess } from "@/hooks/use-admin-access"

// Custom hook for Skyblock manual refresh
const useSkyblockManualRefresh = () => {
  return useQuery({
    queryKey: ["skyblock-manual-refresh"],
    queryFn: async () => {
      const response = await fetch("/api/skyblock/items/refresh", { method: "POST" })
      if (!response.ok) throw new Error("Failed to force refresh Skyblock catalog")
      return response.json()
    },
    enabled: false, // Don't run automatically
    retry: false,
  })
}

// Custom hook for Skyblock refresh if stale
const useSkyblockRefreshIfStale = (days: number) => {
  return useQuery({
    queryKey: ["skyblock-refresh-if-stale", days],
    queryFn: async () => {
      const response = await fetch(`/api/skyblock/items/refresh-if-stale?days=${days}`, { method: "POST" })
      if (!response.ok) throw new Error("Failed to refresh Skyblock catalog if stale")
      return response.json()
    },
    enabled: false, // Don't run automatically
    retry: false,
  })
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [pruningEnabled, setPruningEnabled] = useState(true)
  const [pruningDays, setPruningDays] = useState("30")
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:8080")
  const [skyblockRefreshDays, setSkyblockRefreshDays] = useState(30)

  // Skyblock refresh queries
  const manualRefreshQuery = useSkyblockManualRefresh()
  const refreshIfStaleQuery = useSkyblockRefreshIfStale(skyblockRefreshDays)

  // Fetch system health
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useBackendQuery<SystemHealth>(
    "/api/health",
    { refetchInterval: 30000, requireAuth: false }
  )

  // Fetch system metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useBackendQuery<SystemMetrics>(
    "/api/metrics", 
    { refetchInterval: 30000, requireAuth: true }
  )

  // Use the admin access hook
  const { hasAdminAccess, loading: adminLoading, error } = useAdminAccess()

  // Maintenance mode (kill switch)
  const { data: maint, refetch: refetchMaint } = useBackendQuery<{ enabled: boolean }>(
    "/api/admin/maintenance",
    { enabled: hasAdminAccess, requireAuth: true, queryKey: ["maintenance"] }
  )
  const [maintBusy, setMaintBusy] = useState(false)
  const toggleMaintenance = async (next: boolean) => {
    if (next && !window.confirm("Turn ON maintenance mode? This makes the API return 503 for ALL non-admin users: the site goes down for everyone but admins.")) return
    setMaintBusy(true)
    try {
      await fetchWithBackendUrl("/api/admin/maintenance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      })
      await refetchMaint()
      toast({ title: next ? "Maintenance mode ON" : "Maintenance mode OFF", description: next ? "The site is now down for non-admins." : "The site is back up." })
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    } finally {
      setMaintBusy(false)
    }
  }

  const handleSaveSettings = () => {
    // Store API endpoint in localStorage
    localStorage.setItem("apiEndpoint", apiEndpoint)
    
    // Immediately test the new endpoint by refetching health and metrics
    refetchHealth()
    refetchMetrics()
    
    toast({
      title: "Settings Saved",
      description: "Backend API endpoint updated. Testing connection...",
    })
  }

  const selectPreset = (url: string) => {
    setApiEndpoint(url)
    localStorage.setItem("apiEndpoint", url)
    refetchHealth()
    refetchMetrics()
    toast({ title: "Backend switched", description: url })
  }

  // Load API endpoint from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("apiEndpoint")
    if (saved) {
      setApiEndpoint(saved)
    }
  }, [])

  // Skyblock manual refresh
  const handleSkyblockManualRefresh = async () => {
    try {
      await manualRefreshQuery.refetch()
      toast({ title: "Skyblock Catalog Refreshed", description: "Skyblock item catalog was force refreshed." })
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    }
  }

  // Skyblock refresh if stale
  const handleSkyblockRefreshIfStale = async () => {
    try {
      await refreshIfStaleQuery.refetch()
      toast({ title: "Skyblock Catalog Refreshed (If Stale)", description: `Skyblock item catalog refreshed if older than ${skyblockRefreshDays} days.` })
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" })
    }
  }

  const isSkyblockRefreshing = manualRefreshQuery.isFetching || refreshIfStaleQuery.isFetching

  // Show loading state while checking admin access
  if (adminLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">System configuration and management</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">System configuration and management</p>
          </div>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  // Only show access denied if we're sure the user doesn't have access
  if (!hasAdminAccess && error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">System configuration and management</p>
          </div>
        </div>
        <p className="text-red-500">Access denied. You don't have admin permissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-muted-foreground" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">System configuration and management</p>
        </div>
      </div>

      {/* Maintenance mode - kill switch */}
      <Card className={maint?.enabled ? "border-red-500/50 bg-red-500/5" : "border-amber-500/30"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className={`h-5 w-5 ${maint?.enabled ? "text-red-400" : "text-amber-400"}`} />
            Maintenance mode
            {maint?.enabled && <Badge variant="outline" className="ml-1 border-red-500/40 text-red-400">SITE DOWN</Badge>}
          </CardTitle>
          <CardDescription>
            Emergency kill switch. When on, the API returns 503 for every non-admin request (admins keep access so you can turn it back off). Takes effect instantly, no redeploy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="maintenance-toggle">{maint?.enabled ? "The site is currently DOWN for users" : "The site is up"}</Label>
              <p className="text-sm text-muted-foreground">Use this if something goes wrong (bad deploy, abuse, data issue).</p>
            </div>
            <Switch id="maintenance-toggle" checked={!!maint?.enabled} disabled={maintBusy} onCheckedChange={toggleMaintenance} />
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Current system health and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <StatusCard
              title="API Status"
              icon={Wifi}
              status={health?.status}
              isLoading={healthLoading}
            />
            
            <StatusCard
              title="Database"
              icon={Database}
              status={metrics?.dbStatus}
              isLoading={healthLoading}
              iconColorClass="text-blue-600 dark:text-blue-400"
              bgColorClass="bg-blue-100 dark:bg-blue-900/20"
            />
            
            <StatusCard
              title="Last Fetch"
              icon={Activity}
              value={metricsLoading ? "Loading..." : metrics?.lastFetch ? new Date(metrics.lastFetch).toLocaleString() : "Never"}
              iconColorClass="text-orange-600 dark:text-orange-400"
              bgColorClass="bg-orange-100 dark:bg-orange-900/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Manage catalog refresh and data synchronization for Skyblock Items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Skyblock Items Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Skyblock: Manual Catalog Refresh</Label>
                <p className="text-sm text-muted-foreground">Manually trigger a full Skyblock item catalog refresh from the backend</p>
              </div>
              <Button onClick={handleSkyblockManualRefresh} disabled={isSkyblockRefreshing} variant="outline">
                {isSkyblockRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Now
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="skyblock-refresh-days">Refresh If Stale (days):</Label>
                <Input
                  id="skyblock-refresh-days"
                  type="number"
                  min={1}
                  value={skyblockRefreshDays}
                  onChange={e => setSkyblockRefreshDays(Number(e.target.value))}
                  className="w-20"
                />
              </div>
              <Button onClick={handleSkyblockRefreshIfStale} disabled={isSkyblockRefreshing} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh If Stale
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Pruning */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Pruning
            <Badge variant="outline" className="ml-2 text-xs bg-gradient-to-r from-gray-50 to-slate-50 dark:from-neutral-950/50 dark:to-slate-950/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
              🚧 Coming Soon
            </Badge>
          </CardTitle>
          <CardDescription>Configure automatic cleanup of old data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="pruning-enabled">Enable Data Pruning</Label>
              <p className="text-sm text-muted-foreground">Automatically remove old historical data</p>
            </div>
            <Switch id="pruning-enabled" checked={pruningEnabled} onCheckedChange={setPruningEnabled} disabled />
          </div>

          {pruningEnabled && (
            <div className="space-y-2">
              <Label htmlFor="pruning-days">Retention Period (days)</Label>
              <Input
                id="pruning-days"
                type="number"
                value={pruningDays}
                onChange={(e) => setPruningDays(e.target.value)}
                placeholder="30"
                className="w-full"
                disabled
              />
              <p className="text-sm text-muted-foreground">Data older than this will be automatically deleted</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backend connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Backend connection
          </CardTitle>
          <CardDescription>Which backend the dashboard talks to. Saved in your browser; switch anytime.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {BACKEND_PRESETS.map((p) => {
              const active = apiEndpoint === p.url
              return (
                <button
                  key={p.label}
                  type="button"
                  disabled={p.disabled}
                  onClick={() => selectPreset(p.url)}
                  className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${p.disabled ? "cursor-not-allowed opacity-50" : "hover:border-foreground/30"} ${active ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.label} <span className="text-xs font-normal text-muted-foreground">{p.note}</span></div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{p.url || "not configured"}</div>
                  </div>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Custom endpoint</summary>
            <div className="mt-2 flex gap-2">
              <Input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="http://localhost:8080" className="font-mono text-sm" />
              <Button variant="outline" onClick={handleSaveSettings}>Save</Button>
            </div>
          </details>

          <p className="text-xs text-muted-foreground">Active: <span className="font-mono text-foreground">{apiEndpoint || "default"}</span></p>
        </CardContent>
      </Card>
    </div>
  )
}
