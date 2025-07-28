import { NextRequest, NextResponse } from "next/server"
import { postFetchFromBackend } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const response = await postFetchFromBackend(request, "/api/skyblock/items/refresh", {
      method: "POST",
    })

    if (!response.ok) {
      throw new Error("Failed to refresh Skyblock catalog")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error refreshing Skyblock catalog:", error)
    return NextResponse.json(
      { error: "Failed to refresh Skyblock catalog" },
      { status: 500 }
    )
  }
} 