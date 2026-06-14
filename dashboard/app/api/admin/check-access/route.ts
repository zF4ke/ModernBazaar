import { type NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '@/lib/api'
import { isBackendError } from '@/types/errors'

/**
 * Reports whether the current user has admin access by probing an admin endpoint
 * with the server-side session token (nextjs-auth0 v4). The old version read an
 * Authorization header off the browser request, which is never present here, so
 * it always 401'd — which made admins look like they had no access. Always
 * returns 200 with { hasAccess } so the client query doesn't treat it as an error.
 */
export async function GET(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, '/api/admin/plans', {})
    if (isBackendError(result)) {
      return NextResponse.json({ hasAccess: false })
    }
    return NextResponse.json({ hasAccess: true })
  } catch {
    return NextResponse.json({ hasAccess: false })
  }
}
