import { type NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await postFetchFromBackend(request, "/api/me/subscription/cancel", { body })
  } catch {
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
  }
}
