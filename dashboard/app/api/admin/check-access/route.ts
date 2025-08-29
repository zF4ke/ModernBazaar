import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080'
    
    // Get the Authorization header from the request
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
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
      return NextResponse.json({ hasAccess: false }, { status: 403 })
    }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return NextResponse.json(
      { error: 'Failed to check admin access' },
      { status: 500 }
    )
  }
}
