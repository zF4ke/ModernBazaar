import { NextRequest, NextResponse } from 'next/server'
import { handleBackendError } from '@/lib/api'

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'
    
    // Get the Authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { 
          hasAccess: false,
          error: 'Authorization header required',
          details: 'This endpoint requires a valid JWT token in the Authorization header'
        },
        { status: 401 }
      )
    }

    // Check if user has admin access by trying to access admin endpoint
    const response = await fetch(`${backendUrl}/api/admin/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (response.ok) {
      return NextResponse.json({ hasAccess: true })
    } else {
      const errorDetails = await handleBackendError(response, '/api/admin/plans')
      return NextResponse.json({ 
        hasAccess: false,
        ...errorDetails
      }, { status: errorDetails.status })
    }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { 
        hasAccess: false,
        error: 'Failed to check admin access',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
