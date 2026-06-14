import { type NextRequest, NextResponse } from 'next/server'
import { postFetchFromBackend } from '@/lib/api'

/**
 * Provision the logged-in user (idempotent free-plan setup).
 *
 * nextjs-auth0 v4 keeps the access token in the server session, so we acquire it
 * server-side via postFetchFromBackend rather than expecting a client-sent
 * Authorization header (the old SPA flow, which always 401'd here). When there is
 * no valid session the backend returns 401 and we forward it as-is.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text().catch(() => '')
    return await postFetchFromBackend(request, '/api/me/setup', body ? { body } : {})
  } catch {
    return NextResponse.json({ error: 'User setup failed' }, { status: 500 })
  }
}
