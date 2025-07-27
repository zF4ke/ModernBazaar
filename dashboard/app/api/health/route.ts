import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    const healthData = await fetchFromBackend(request, "/actuator/health")
    return NextResponse.json(healthData)
  } catch (error) {
    return NextResponse.json(
      { 
        status: "DOWN",
        error: "Backend unavailable" 
      },
      { status: 503 }
    )
  }
} 