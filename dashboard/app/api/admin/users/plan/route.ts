import { type NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await postFetchFromBackend(request, "/api/admin/users/plan", { body })
  } catch {
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 })
  }
}
