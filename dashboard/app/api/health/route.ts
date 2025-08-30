import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"

export async function GET(request: NextRequest) {
  try {
    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization') || undefined
    const token = authHeader?.replace(/^Bearer\s+/i, '')

    const healthOrError: any = await fetchFromBackend(request, "/actuator/health", {}, token)
    if (typeof healthOrError?.status === 'number' && healthOrError.status >= 400) {
      return NextResponse.json(healthOrError, { status: healthOrError.status })
    }
    return NextResponse.json(healthOrError)
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
