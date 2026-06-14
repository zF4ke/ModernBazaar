import { type NextRequest, NextResponse } from 'next/server'
import { fetchFromBackend, postFetchFromBackend } from '@/lib/api'
import { isBackendError } from '@/types/errors'

// nextjs-auth0 v4: token comes from the server session, not a client header.
export async function GET(request: NextRequest) {
  try {
    const result = await fetchFromBackend(request, '/api/admin/plans', {})
    if (isBackendError(result)) return NextResponse.json(result, { status: result.status })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    return await postFetchFromBackend(request, '/api/admin/plans', { body })
  } catch {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
