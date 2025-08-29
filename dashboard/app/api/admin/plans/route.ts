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

    const response = await fetch(`${backendUrl}/api/admin/plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    })

    if (!response.ok) {
      const errorDetails = await handleBackendError(response, '/api/admin/plans')
      return NextResponse.json(errorDetails, { status: errorDetails.status })
    }

    const plans = await response.json()
    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch plans',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    const response = await fetch(`${backendUrl}/api/admin/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorDetails = await handleBackendError(response, '/api/admin/plans')
      return NextResponse.json(errorDetails, { status: errorDetails.status })
    }

    const plan = await response.json()
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create plan',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}
