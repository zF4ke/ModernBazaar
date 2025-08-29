import { type NextRequest, NextResponse } from "next/server"
import type { BazaarItemHourSummary } from "@/types/bazaar"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const resolvedParams = await params
  const { productId } = resolvedParams
  
  // Get query parameters
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || '5'

  try {
    const endpoint = `/api/bazaar/items/${encodeURIComponent(productId)}/snapshots?limit=${limit}`
    
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const snapshotsOrError: BazaarItemHourSummary[] | { status: number; [key: string]: any } = await fetchFromBackend(request, endpoint, {}, token)

    if (typeof (snapshotsOrError as any)?.status === 'number' && (snapshotsOrError as any).status >= 400) {
      return NextResponse.json(snapshotsOrError as any, { status: (snapshotsOrError as any).status })
    }
    
    // Cache for 30 seconds (snapshots change frequently)
    const response = NextResponse.json(snapshotsOrError as BazaarItemHourSummary[])
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=15')
    return response
  } catch (error) {
    console.error('Error fetching item snapshots:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('status: 404')) {
      return NextResponse.json({ error: "Item snapshots not found" }, { status: 404 })
    }
    
    return NextResponse.json(
      { error: "Failed to fetch item snapshots from backend" },
      { status: 500 }
    )
  }
}
