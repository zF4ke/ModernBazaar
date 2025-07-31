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
    return NextResponse.json(item)
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
