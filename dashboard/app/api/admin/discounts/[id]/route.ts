import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await fetchFromBackend(request, `/api/admin/discounts/${id}`, { method: "DELETE" })
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 })
  }
}
