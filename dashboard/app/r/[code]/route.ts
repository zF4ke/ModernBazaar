import { after, type NextRequest, NextResponse } from "next/server"

/**
 * Creator referral link: modernbazaar.com/r/CODE
 *
 * Records the click (fire-and-forget, anonymous), drops the 60-day `mb_ref`
 * attribution cookie, and redirects to the landing page. The cookie rides
 * through Stripe checkout as subscription metadata; the webhook credits the
 * code on the referred user's first payment.
 */
const ATTRIBUTION_DAYS = 60
const VISITOR_COOKIE = "mb_ref_visitor"

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const clean = (code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40)

  const response = NextResponse.redirect(new URL("/", request.url))
  if (!clean) return response
  const visitorKey = request.cookies.get(VISITOR_COOKIE)?.value || crypto.randomUUID()
  const secure = request.nextUrl.protocol === "https:"

  response.cookies.set("mb_ref", clean, {
    maxAge: ATTRIBUTION_DAYS * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
  })
  response.cookies.set(VISITOR_COOKIE, visitorKey, {
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure,
  })

  // Complete click tracking after the redirect response without making the
  // visitor wait or relying on an unobserved promise in a serverless runtime.
  const backend = (process.env.BACKEND_URL || "http://localhost:8080").replace(/\/+$/, "")
  after(async () => {
    try {
      await fetch(`${backend}/api/v1/referral/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: clean, visitorKey }),
        signal: AbortSignal.timeout(2_000),
      })
    } catch {
      // Attribution must never break the visitor's redirect.
    }
  })

  return response
}
