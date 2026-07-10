import type { NextRequest } from "next/server"
import { auth0 } from "@/lib/auth0"

/**
 * Mounts the Auth0 v4 auth routes and keeps the session rolling:
 *   /auth/login, /auth/logout, /auth/callback, /auth/profile, /auth/access-token
 */
export async function middleware(request: NextRequest) {
  const response = await auth0.middleware(request)

  // Persist refreshed access tokens while we still have a mutable response.
  // Route handlers call getAccessToken() later to proxy API requests, but a token
  // refreshed there may not be written back to the session cookie. Once the old
  // access token expires that presents as a backend 401 until the user signs in
  // again. Refreshing here follows the SDK's recommended middleware path and keeps
  // long-lived sessions usable without a logout/login cycle.
  try {
    await auth0.getAccessToken(request, response)
  } catch {
    // Anonymous requests and sessions created without a refresh token are handled
    // by the normal auth flow. Never block public pages from middleware.
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals and static asset files.
     * (Auth routes live under /auth/* and are handled by auth0.middleware.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
}
