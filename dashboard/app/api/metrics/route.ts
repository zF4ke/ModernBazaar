import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const metrics = await fetchFromBackend(request, "/api/metrics")
    return NextResponse.json(metrics)
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
