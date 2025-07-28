import { type NextRequest, NextResponse } from "next/server"
import type { SkyblockItem } from "@/types/skyblock"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const endpoint = `/api/skyblock/items${queryString ? `?${queryString}` : ''}`

  try {
    const response: SkyblockItem[] = await fetchFromBackend(request, endpoint)
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch skyblock items from backend" },
      { status: 500 }
    )
  }
} 