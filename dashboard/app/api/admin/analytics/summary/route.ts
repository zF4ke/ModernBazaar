import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const qs = searchParams.toString()
  const endpoint = `/api/admin/analytics/summary${qs ? `?${qs}` : ""}`

  try {
    const result = await fetchFromBackend(request, endpoint, {})
    if (isBackendError(result)) {
      return NextResponse.json(result, { status: result.status })
    }
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch admin analytics from backend" }, { status: 500 })
  }
}
