import { type NextRequest, NextResponse } from "next/server"
import type { BazaarItemHourAverage } from "@/types/bazaar"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params
  const { productId } = resolvedParams

  try {
    const average: BazaarItemHourAverage = await fetchFromBackend(
      request, 
      `/api/bazaar/items/${encodeURIComponent(productId)}/average`
    )
    
    // Cache for 4.5 minutes (slightly less than backend's 5 minutes)
    const response = NextResponse.json(average)
    response.headers.set('Cache-Control', 'public, s-maxage=270, stale-while-revalidate=60')
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('status: 404')) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: "Failed to fetch item average from backend" },
      { status: 500 }
    )
  }
} 