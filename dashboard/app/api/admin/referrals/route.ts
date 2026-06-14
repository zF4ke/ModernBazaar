import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend, postFetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function GET(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, "/api/admin/referrals", {})
    if (isBackendError(result)) {
      return NextResponse.json(result, { status: result.status })
    }
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to fetch referrals" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await postFetchFromBackend(request, "/api/admin/referrals", { body })
  } catch {
    return NextResponse.json({ error: "Failed to create referral code" }, { status: 500 })
  }
}
