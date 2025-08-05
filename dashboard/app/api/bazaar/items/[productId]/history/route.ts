import { type NextRequest, NextResponse } from "next/server"
import type { BazaarItemHourSummary } from "@/types/bazaar"
import { fetchFromBackend, buildQueryParams } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params
  const { productId } = resolvedParams
  
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const withPoints = searchParams.get('withPoints')

  try {
    const endpoint = `/api/bazaar/items/${encodeURIComponent(productId)}/history`
    
    // Always build query params since we always have withPoints
    const queryParams = buildQueryParams({
      from,
      to,
      withPoints
    })
    
    const fullEndpoint = `${endpoint}?${queryParams.toString()}`

    const history: BazaarItemHourSummary[] = await fetchFromBackend(
      request, 
      fullEndpoint
    )
    
    // Cache for 55 seconds (slightly less than backend's 60 seconds)
    const response = NextResponse.json(history)
    response.headers.set('Cache-Control', 'public, s-maxage=55, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('Error fetching item history:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('status: 404')) {
      return NextResponse.json({ error: "Item history not found" }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: "Failed to fetch item history from backend" },
      { status: 500 }
    )
  }
} 