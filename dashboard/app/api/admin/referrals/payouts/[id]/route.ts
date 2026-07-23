import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend, postFetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

/** POST marks the payout paid; DELETE removes a mistaken entry. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return await postFetchFromBackend(request, `/api/admin/referrals/payouts/${id}/paid`, { body: "{}" })
  } catch {
    return NextResponse.json({ error: "Failed to mark payout paid" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await fetchFromBackend(request, `/api/admin/referrals/payouts/${id}`, { method: "DELETE" })
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to delete payout" }, { status: 500 })
  }
}
