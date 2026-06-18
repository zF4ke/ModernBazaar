import { type NextRequest, NextResponse } from "next/server"
import { fetchFromBackend } from "@/lib/api"
import { isBackendError } from "@/types/errors"

// Proxy to the backend, which creates a Stripe Customer-Portal session (manage
// payment method / invoices / cancel) for the signed-in user and returns { url }.
export async function POST(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, "/api/me/billing/portal-session", { method: "POST", body: "{}" })
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 })
  }
}
