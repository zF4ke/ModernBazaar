import { type NextRequest, NextResponse } from "next/server"
import type { PagedResponse } from "@/types/strategies"
import type { FlipOpportunity } from "@/types/strategies"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const endpoint = `/api/strategies/flipping${queryString ? `?${queryString}` : ''}`

  try {
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const result = await fetchFromBackend(request, endpoint, {}, token)

    if (isBackendError(result)) {
      return NextResponse.json(result, { status: result.status })
    }

    const nextResponse = NextResponse.json(result as PagedResponse<FlipOpportunity>)
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
    return nextResponse
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch flipping opportunities from backend" },
      { status: 500 }
    )
  }
}

