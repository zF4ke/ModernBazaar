import { type NextRequest, NextResponse } from 'next/server'
import { postFetchFromBackend } from '@/lib/api'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; action: string }> }
) {
  const { slug, action } = await params
  if (!['activate', 'deactivate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  try {
    return await postFetchFromBackend(request, `/api/admin/plans/${slug}/${action}`, {})
  } catch {
    return NextResponse.json({ error: `Failed to ${action} plan` }, { status: 500 })
  }
}
