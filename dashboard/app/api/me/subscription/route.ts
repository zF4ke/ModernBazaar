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

    const response = await fetch(`${backendUrl}/api/me/subscription`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorDetails = await handleBackendError(response, '/api/me/subscription')
      return NextResponse.json(errorDetails, { status: errorDetails.status })
    }

    const subscription = await response.json()
    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscription',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
