import { type NextRequest, NextResponse } from "next/server"
import type { ItemsResponse } from "@/types/bazaar"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Build endpoint with query parameters
  const queryString = searchParams.toString()
  const endpoint = `/api/items${queryString ? `?${queryString}` : ''}`

  try {
    const response: ItemsResponse = await fetchFromBackend(request, endpoint)
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch items from backend" },
      { status: 500 }
    )
  }
}
