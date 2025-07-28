"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Activity, Database, DollarSign, Package, Zap } from "lucide-react"
import type { SystemMetrics, TimeSeriesData } from "@/types/metrics"

async function fetchMetrics(): Promise<SystemMetrics> {
  const response = await fetch("/api/metrics")
  if (!response.ok) throw new Error("Failed to fetch metrics")
  return response.json()
}

async function fetchTimeSeries(): Promise<{ latency: TimeSeriesData[]; heap: TimeSeriesData[] }> {
  const response = await fetch("/api/metrics/timeseries")
  if (!response.ok) throw new Error("Failed to fetch time series data")
  return response.json()
}

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
  })

  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ["timeseries"],
    queryFn: fetchTimeSeries,
  })

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const latencyData =
    timeSeries?.latency.map((item) => ({
      time: formatTime(item.timestamp),
      value: item.value,
    })) || []

  const heapData =
    timeSeries?.heap.map((item) => ({
      time: formatTime(item.timestamp),
      value: item.value,
    })) || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsLoading ? "..." : metrics?.totalItems?.toLocaleString() ?? "0"}</div>
            <p className="text-xs text-muted-foreground">Active marketplace items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Spread</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsLoading ? "..." : `${metrics?.avgSpread?.toFixed(2) ?? "0.00"}`}</div>
            <p className="text-xs text-muted-foreground">Average buy-sell spread</p>
          </CardContent>
        </Card>

        <Card className="opacity-50 select-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                              {metricsLoading ? "..." : `${((metrics?.volume24h || 0) / 1000000).toFixed(1)}M`}
            </div>
            <p className="text-xs text-muted-foreground">Trading volume today</p>
          </CardContent>
        </Card>

        <Card className="opacity-50 select-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsLoading ? "..." : `${metrics?.apiLatency ?? "0"}ms`}</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heap Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricsLoading ? "..." : `${metrics?.heapUsage?.toFixed(1) ?? "0.0"}%`}</div>
            <p className="text-xs text-muted-foreground">Memory utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>API Latency</CardTitle>
            <CardDescription>Response time over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                latency: {
                  label: "Latency (ms)",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-latency)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heap Usage</CardTitle>
            <CardDescription>Memory utilization over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                heap: {
                  label: "Heap Usage (%)",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={heapData}>
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-heap)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
