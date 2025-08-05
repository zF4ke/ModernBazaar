import { NextResponse } from "next/server"
import type { TimeSeriesData } from "@/types/metrics"

export async function GET() {
  const now = new Date()
  const latencyData: TimeSeriesData[] = []
  const heapData: TimeSeriesData[] = []

  // Generate mock time series data for the last 24 hours
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString()
    latencyData.push({
      timestamp,
      value: 30 + Math.random() * 40, // 30-70ms latency
    })
    heapData.push({
      timestamp,
      value: 50 + Math.random() * 30, // 50-80% heap usage
    })
  }

  // Cache for 5 minutes (mock data doesn't change frequently)
  const response = NextResponse.json({ latency: latencyData, heap: heapData })
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
  return response
}
