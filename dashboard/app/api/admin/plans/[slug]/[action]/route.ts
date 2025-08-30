import { NextRequest, NextResponse } from 'next/server'
import { handleBackendError } from '@/lib/api'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; action: string }> }
) {
  const { slug, action } = await params
  
  try {
    
    if (!['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { 
          error: 'Invalid action',
          details: 'Action must be either "activate" or "deactivate"'
        },
        { status: 400 }
      )
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'
    
    // Get the Authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { 
          error: 'Authorization header required',
          details: 'This endpoint requires a valid JWT token in the Authorization header'
        },
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
      const errorDetails = await handleBackendError(response, '/api/admin/plans')
      return NextResponse.json(errorDetails, { status: errorDetails.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error ${action}ing plan:`, error)
    return NextResponse.json(
      { 
        error: `Failed to ${action} plan`,
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
