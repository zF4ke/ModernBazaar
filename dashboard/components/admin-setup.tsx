"use client"

import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export function AdminSetup() {
  const { user, getAccessTokenSilently } = useAuth0()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const grantAdminAccess = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      const token = await getAccessTokenSilently()
      
      // This would call your backend to grant admin access
      const response = await fetch('/api/admin/grant-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Admin access granted to ${email}`
        })
        setEmail('')
      } else {
        const error = await response.text()
        toast({
          title: "Error",
          description: `Failed to grant admin access: ${error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to grant admin access:', error)
      toast({
        title: "Error",
        description: "Failed to grant admin access",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Only show for current admin users
  if (!user?.email) return null

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Grant Admin Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="email">User Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={grantAdminAccess} 
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? 'Granting...' : 'Grant Admin Access'}
        </Button>
        
        <div className="text-xs text-gray-600">
          <p><strong>Current User:</strong> {user.email}</p>
          <p><strong>Note:</strong> This requires backend implementation</p>
        </div>
      </CardContent>
    </Card>
  )
}
