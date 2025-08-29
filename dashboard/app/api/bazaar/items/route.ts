import { type NextRequest, NextResponse } from "next/server"
import type { BazaarItemsResponse } from "@/types/bazaar"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Build endpoint with query parameters
  const queryString = searchParams.toString()
  const endpoint = `/api/bazaar/items${queryString ? `?${queryString}` : ''}`

  try {
    // Forward Authorization header if present so backend can authenticate
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const response: BazaarItemsResponse | { status: number; [key: string]: any } = await fetchFromBackend(
      request,
      endpoint,
      {},
      token
    )

    // If backend returned an error payload with a status, propagate it
    if (typeof (response as any)?.status === 'number' && (response as any).status >= 400) {
      return NextResponse.json(response as any, { status: (response as any).status })
    }

    // Cache for 45 seconds (slightly less than backend's 60 seconds)
    const nextResponse = NextResponse.json(response as BazaarItemsResponse)
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=30')
    return nextResponse
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch items from backend" },
      { status: 500 }
    )
  }
}
