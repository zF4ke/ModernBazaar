import { type NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.text()
    return await postFetchFromBackend(request, `/api/admin/discounts/${id}/active`, { body })
  } catch {
    return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 })
  }
}
