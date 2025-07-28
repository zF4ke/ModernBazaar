import { NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = searchParams.get("days")

    if (!days) {
      return NextResponse.json(
        { error: "Days parameter is required" },
        { status: 400 }
      )
    }

    const response = await postFetchFromBackend(request, `/api/skyblock/items/refresh-if-stale?days=${days}`, {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to refresh Skyblock catalog if stale")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error refreshing Skyblock catalog if stale:", error)
    return NextResponse.json(
      { error: "Failed to refresh Skyblock catalog if stale" },
      { status: 500 }
    )
  }
} 