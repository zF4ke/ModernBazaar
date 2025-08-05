import { type NextRequest, NextResponse } from "next/server"
import type { BazaarItemLiveView } from "@/types/bazaar"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params
  const { productId } = resolvedParams

  try {
    const item: BazaarItemLiveView = await fetchFromBackend(
      request, 
      `/api/bazaar/items/${encodeURIComponent(productId)}`
    )
    
    // Cache for 45 seconds (slightly less than backend's 60 seconds)
    const response = NextResponse.json(item)
    response.headers.set('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=30')
    return response
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('status: 404')) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: "Failed to fetch item detail from backend" },
      { status: 500 }
    )
  }
}
