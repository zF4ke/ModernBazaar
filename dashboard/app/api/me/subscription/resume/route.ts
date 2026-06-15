import { type NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    return await postFetchFromBackend(request, "/api/me/subscription/resume", { body: "{}" })
  } catch {
    return NextResponse.json({ error: "Failed to resume subscription" }, { status: 500 })
  }
}
