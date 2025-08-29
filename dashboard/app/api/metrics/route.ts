import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const metricsOrError: any = await fetchFromBackend(request, "/api/metrics", {}, token)
    
    // If backend replied with an error payload that includes status, propagate it
    if (typeof metricsOrError?.status === 'number' && metricsOrError.status >= 400) {
      return NextResponse.json(metricsOrError, { status: metricsOrError.status })
    }
    
    // Cache for 30 seconds (metrics don't change as frequently)
    const response = NextResponse.json(metricsOrError)
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
