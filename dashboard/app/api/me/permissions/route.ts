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
          error: 'Authorization header required',
          details: 'This endpoint requires a valid JWT token in the Authorization header'
        },
        { status: 401 }
      )
    }

    const response = await fetch(`${backendUrl}/api/me/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorDetails = await handleBackendError(response, '/api/me/permissions')
      return NextResponse.json(errorDetails, { status: errorDetails.status })
    }

    const permissions = await response.json()
    
    // Return the permissions directly since the backend already returns the correct structure
    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch permissions',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
