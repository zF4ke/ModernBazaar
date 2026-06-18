import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

// Proxy to the backend, which creates a Stripe Checkout Session for the signed-in
// user (token from the session cookie) and returns { url }. Parse the backend JSON
// and re-emit it so the client can reliably read { url } from the response.
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const result = await fetchFromBackend(request, "/api/me/billing/checkout-session", { method: "POST", body })
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 })
  }
}
