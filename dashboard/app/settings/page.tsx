"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, Clock, Trash2, Server, Wifi, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { StatusCard } from "@/components/status-card"

interface SystemHealth {
  status: string
}

interface SystemMetrics {
  lastFetch: string | null
  status: string,
  dbStatus: string,
  avgSpread: number,
  heapUsage: number,
  totalItems: number,
}

export default function SettingsPage() {
  const { toast } = useToast()
  const [pruningEnabled, setPruningEnabled] = useState(true)
  const [pruningDays, setPruningDays] = useState("30")
  const [apiEndpoint, setApiEndpoint] = useState("http://localhost:8080")

  // Fetch system health
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useBackendQuery<SystemHealth>(
    "/api/health",
    { refetchInterval: 30000 }
  )

  // Fetch system metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useBackendQuery<SystemMetrics>(
    "/api/metrics", 
    { refetchInterval: 30000 }
  )

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

  // Load API endpoint from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("apiEndpoint")
    if (saved) {
      setApiEndpoint(saved)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

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
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Manage catalog refresh and data synchronization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Manual Catalog Refresh</Label>
              <p className="text-sm text-muted-foreground">Manually trigger a full catalog refresh from the backend</p>
            </div>
            <Button onClick={handleManualRefresh} disabled={isRefreshing} variant="outline">
              {isRefreshing ? (
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

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
                <p className="text-sm text-muted-foreground">Automatically refresh data at regular intervals</p>
              </div>
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="poll-interval">Poll Interval (seconds)</Label>
              <Select value={pollInterval} onValueChange={setPollInterval}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="600">10 minutes</SelectItem>
                  <SelectItem value="1800">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Data Pruning */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Pruning
          </CardTitle>
          <CardDescription>Configure automatic cleanup of old data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="pruning-enabled">Enable Data Pruning</Label>
              <p className="text-sm text-muted-foreground">Automatically remove old historical data</p>
            </div>
            <Switch id="pruning-enabled" checked={pruningEnabled} onCheckedChange={setPruningEnabled} />
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
              />
              <p className="text-sm text-muted-foreground">Data older than this will be automatically deleted</p>
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Performance Settings */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performance Settings
          </CardTitle>
          <CardDescription>Configure caching and performance options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
              <Input id="cache-ttl" type="number" defaultValue="300" placeholder="300" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-connections">Max Connections</Label>
              <Input id="max-connections" type="number" defaultValue="100" placeholder="100" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-endpoint">API Endpoint</Label>
            <Input
              id="api-endpoint"
              defaultValue="https://api.modernbazaar.com"
              placeholder="https://api.modernbazaar.com"
            />
          </div>
        </CardContent>
      </Card> */}

      {/* Save Settings */}
      {/* <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="w-full md:w-auto">
          Save Settings
        </Button>
      </div> */}


      

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

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Performance Settings
          </CardTitle>
          <CardDescription>Configure API connection and performance options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-endpoint">Backend API Endpoint</Label>
            <Input
              id="api-endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="http://localhost:8080"
            />
            <p className="text-sm text-muted-foreground">
              The URL of the backend API server. Changes take effect immediately after saving.
            </p>
            {apiEndpoint !== "http://localhost:8080" && (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Currently using: {apiEndpoint}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="w-full md:w-auto">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
