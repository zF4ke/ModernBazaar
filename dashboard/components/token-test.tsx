"use client"

import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function TokenTest() {
  const { getAccessTokenSilently, isAuthenticated, user, loginWithRedirect } = useAuth0()
  const [tokenInfo, setTokenInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testTokenRefresh = async () => {
    if (!isAuthenticated) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Testing token refresh...')
      console.log('🔍 Current Auth0 state:', { isAuthenticated, user: user?.sub })
      
      // First, get the token normally
      const token = await getAccessTokenSilently()
      console.log('✅ Token retrieved successfully')
      
      // Decode the token to see its contents
      const [, payloadB64] = token.split('.')
      if (payloadB64) {
        const norm = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payloadB64.length % 4)) % 4)
        const json = atob(norm)
        const payload = JSON.parse(json)
        
        console.log('📋 Full token payload:', payload)
        console.log('🔑 Token scopes:', payload.scope)
        console.log('🔑 Token audience:', payload.aud)
        console.log('🔑 Token issuer:', payload.iss)
        
        setTokenInfo({
          token: token.substring(0, 50) + '...',
          payload: {
            sub: payload.sub,
            aud: payload.aud,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            iat: new Date(payload.iat * 1000).toLocaleString(),
            permissions: payload.permissions || [],
            scope: payload.scope || '',
            issuer: payload.iss
          }
        })
        
        console.log('📋 Token payload:', payload)
      }
      
    } catch (err: any) {
      console.error('❌ Token refresh failed:', err)
      console.error('🧰 Error details:', {
        error: err?.error,
        error_description: err?.error_description,
        message: err?.message,
        stack: err?.stack
      })
      setError(err?.error || err?.message || 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const forceTokenRefresh = async () => {
    if (!isAuthenticated) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Force refreshing token...')
      
      // Force a fresh token by bypassing cache
      const token = await getAccessTokenSilently({
        cacheMode: 'off'
      })
      
      console.log('✅ Force token refresh successful')
      
      // Decode and show the new token
      const [, payloadB64] = token.split('.')
      if (payloadB64) {
        const norm = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payloadB64.length % 4)) % 4)
        const json = atob(norm)
        const payload = JSON.parse(json)
        
        setTokenInfo({
          token: token.substring(0, 50) + '...',
          payload: {
            sub: payload.sub,
            aud: payload.aud,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            iat: new Date(payload.iat * 1000).toLocaleString(),
            permissions: payload.permissions || [],
            scope: payload.scope || '',
            issuer: payload.iss
          }
        })
      }
      
    } catch (err: any) {
      console.error('Force token refresh failed:', err)
      setError(err?.error || err?.message || 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Auth0 Token Test</CardTitle>
        <CardDescription>
          Test and debug token refresh functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testTokenRefresh} 
            disabled={isLoading}
            variant="default"
          >
            Test Token Refresh
          </Button>
          <Button 
            onClick={forceTokenRefresh} 
            disabled={isLoading}
            variant="outline"
          >
            Force Token Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Refreshing token...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive font-medium">Error:</p>
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {tokenInfo && (
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-sm">Token (first 50 chars):</h4>
              <p className="text-xs font-mono bg-muted p-2 rounded">{tokenInfo.token}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm">Token Payload:</h4>
              <div className="text-xs space-y-1">
                <p><strong>Subject:</strong> {tokenInfo.payload.sub}</p>
                <p><strong>Audience:</strong> {tokenInfo.payload.aud}</p>
                <p><strong>Expires:</strong> {tokenInfo.payload.exp}</p>
                <p><strong>Issued:</strong> {tokenInfo.payload.iat}</p>
                <p><strong>Permissions:</strong> {tokenInfo.payload.permissions.join(', ') || 'None'}</p>
                <p><strong>Scope:</strong> {tokenInfo.payload.scope || 'None'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>User ID:</strong> {user?.sub}</p>
          <p><strong>Login Count:</strong> {user?.loginsCount}</p>
        </div>
      </CardContent>
    </Card>
  )
}

