import { type NextRequest, NextResponse } from "next/server"
import type { SkyblockItem } from "@/types/skyblock"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const endpoint = `/api/skyblock/items${queryString ? `?${queryString}` : ''}`

  try {
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const result = await fetchFromBackend(request, endpoint, {}, token)

    if (isBackendError(result)) {
      return NextResponse.json(result, { status: result.status })
    }
    return NextResponse.json(result as SkyblockItem[])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch skyblock items from backend" },
      { status: 500 }
    )
  }
} 
