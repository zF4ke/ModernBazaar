import type { NextRequest } from "next/server"
import { auth0 } from "@/lib/auth0"

/**
 * Mounts the Auth0 v4 auth routes and keeps the session rolling:
 *   /auth/login, /auth/logout, /auth/callback, /auth/profile, /auth/access-token
 */
export async function middleware(request: NextRequest) {
  return await auth0.middleware(request)
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
