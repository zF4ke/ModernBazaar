import { type NextRequest, NextResponse } from "next/server"
import type { SkyblockItem } from "@/types/skyblock"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryString = searchParams.toString()
  const endpoint = `/api/skyblock/items${queryString ? `?${queryString}` : ''}`

  try {
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const responseOrError: SkyblockItem[] | { status: number; [key: string]: any } = await fetchFromBackend(request, endpoint, {}, token)

    if (typeof (responseOrError as any)?.status === 'number' && (responseOrError as any).status >= 400) {
      return NextResponse.json(responseOrError as any, { status: (responseOrError as any).status })
    }
    return NextResponse.json(responseOrError as SkyblockItem[])
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch skyblock items from backend" },
      { status: 500 }
    )
  }
} 
