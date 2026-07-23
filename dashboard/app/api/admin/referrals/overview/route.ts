import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function GET(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, "/api/admin/referrals/overview", {})
    if (isBackendError(result)) {
      return NextResponse.json(result, { status: result.status })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to fetch referral overview" }, { status: 500 })
  }
}
