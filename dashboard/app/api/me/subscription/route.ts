import { type NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend } from '@/lib/api'
import { isBackendError } from '@/types/errors'

// nextjs-auth0 v4: acquire the access token from the server session.
export async function GET(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, '/api/me/subscription', {})
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
