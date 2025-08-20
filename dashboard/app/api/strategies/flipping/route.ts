import { type NextRequest, NextResponse } from "next/server"
import type { PagedResponse } from "@/types/strategies"
import type { FlipOpportunity } from "@/types/strategies"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const endpoint = `/api/strategies/flipping${queryString ? `?${queryString}` : ''}`

  try {
    const response: PagedResponse<FlipOpportunity> = await fetchFromBackend(request, endpoint)

    const nextResponse = NextResponse.json(response)
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
    return nextResponse
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch flipping opportunities from backend" },
      { status: 500 }
    )
  }
}

