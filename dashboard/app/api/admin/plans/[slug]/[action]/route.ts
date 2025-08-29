import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; action: string } }
) {
  try {
    const { slug, action } = params
    
    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use activate or deactivate' },
        { status: 400 }
      )
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'
    
    // Get the Authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const response = await fetch(`${backendUrl}/api/admin/plans/${slug}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error ${params.action}ing plan:`, error)
    return NextResponse.json(
      { error: `Failed to ${params.action} plan` },
      { status: 500 }
    )
  }
}
