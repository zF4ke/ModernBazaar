import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const metrics = await fetchFromBackend(request, "/api/metrics")
    
    // Cache for 30 seconds (metrics don't change as frequently)
    const response = NextResponse.json(metrics)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=15')
    return response
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to fetch metrics from backend",
        lastFetch: null,
        totalItems: 0,
        avgSpread: 0,
        heapUsage: 0,
      },
      { status: 500 }
    )
  }
}
