import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

// Partial update of a plan (e.g. its Lemon Squeezy variant id or active flag).
export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await request.text()
    const result = await fetchFromBackend(request, `/api/admin/plans/${slug}`, { method: "PUT", body })
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 })
  }
}
