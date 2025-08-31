"use client"

import { useAuth0 } from '@auth0/auth0-react'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Plan } from '@/types/subscription'
import { useAdminAccess } from '@/hooks/use-admin-access'

interface CreatePlanForm {
  slug: string
  name: string
  stripePriceId: string
  featuresJson: string
  active: boolean
}

export default function AdminPlansPage() {
  const { isAuthenticated, getAccessTokenSilently, isLoading: authLoading, user, error: auth0Error } = useAuth0()
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<CreatePlanForm>({
    slug: '',
    name: '',
    stripePriceId: '',
    featuresJson: '{\n  "limits": {\n    "maxItemsPerPage": 50,\n    "maxStrategies": 0\n  },\n  "features": {\n    "advancedAnalytics": false,\n    "realTimeUpdates": false\n  }\n}',
    active: true
  })

  const fetchPlans = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping plans fetch')
      return
    }

    try {
      const token = await getAccessTokenSilently()
      const response = await fetch('/api/admin/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch plans",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive"
      })
    }
  }, [isAuthenticated, getAccessTokenSilently, toast])

  // Use the admin access hook
  const { hasAdminAccess, loading: adminLoading, error } = useAdminAccess()

  // Fetch plans when admin access is confirmed and user is authenticated
  useEffect(() => {
    if (hasAdminAccess && isAuthenticated && !authLoading) {
      fetchPlans()
    }
  }, [hasAdminAccess, isAuthenticated, authLoading, fetchPlans])

  const createPlan = async () => {
    if (!form.slug || !form.name) {
      toast({
        title: "Validation Error",
        description: "Slug and name are required",
        variant: "destructive"
      })
      return
    }

    try {
      setCreating(true)
      const token = await getAccessTokenSilently()
      
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Plan created successfully"
        })
        setForm({
          slug: '',
          name: '',
          stripePriceId: '',
          featuresJson: '{\n  "limits": {\n    "maxItemsPerPage": 50,\n    "maxStrategies": 0\n  },\n  "features": {\n    "advancedAnalytics": false,\n    "realTimeUpdates": false\n  }\n}',
          active: true
        })
        fetchPlans()
      } else {
        const error = await response.text()
        toast({
          title: "Error",
          description: `Failed to create plan: ${error}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to create plan:', error)
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive"
      })
    } finally {
      setCreating(false)
    }
  }

  const togglePlanStatus = async (slug: string, active: boolean) => {
    try {
      const token = await getAccessTokenSilently()
      const endpoint = active ? 'activate' : 'deactivate'
      
      const response = await fetch(`/api/admin/plans/${slug}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Plan ${active ? 'activated' : 'deactivated'} successfully`
        })
        fetchPlans()
      } else {
        toast({
          title: "Error",
          description: `Failed to ${active ? 'activate' : 'deactivate'} plan`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to toggle plan status:', error)
      toast({
        title: "Error",
        description: "Failed to update plan status",
        variant: "destructive"
      })
    }
  }

  // Show loading while Auth0 is initializing
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-muted-foreground">Manage subscription plans and their features</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-muted-foreground">Manage subscription plans and their features</p>
          </div>
        </div>
        <div className="space-y-4">
          <p>You need to login to access this page.</p>
          {auth0Error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">Auth0 Error: {auth0Error.message}</p>
            </div>
          )}
          <div className="pt-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
        </div>
        

      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-muted-foreground">Manage subscription plans and their features</p>
          </div>
        </div>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  // Show loading state while checking admin access OR if still loading
  if (adminLoading || (!hasAdminAccess && !error)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-muted-foreground">Manage subscription plans and their features</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Only show access denied if we're sure the user doesn't have access
  if (!hasAdminAccess && error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
            <p className="text-muted-foreground">Manage subscription plans and their features</p>
          </div>
        </div>
        <p className="text-red-500">Access denied. You don't have admin permissions.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-muted-foreground" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plans</h2>
          <p className="text-muted-foreground">Manage subscription plans and their features</p>
        </div>
      </div>

      {/* Create Plan Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="starter"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Starter Plan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="stripePriceId">Stripe Price ID</Label>
            <Input
              id="stripePriceId"
              placeholder="price_1ABC123..."
              value={form.stripePriceId}
              onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="featuresJson">Features JSON</Label>
            <Textarea
              id="featuresJson"
              rows={8}
              value={form.featuresJson}
              onChange={(e) => setForm({ ...form, featuresJson: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          <Button onClick={createPlan} disabled={creating}>
            {creating ? 'Creating...' : 'Create Plan'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Plans */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.slug}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {plan.name}
                  {plan.active ? (
                    <Badge variant="default">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Slug: {plan.slug}
              </p>
              {plan.stripePriceId && (
                <p className="text-xs text-muted-foreground">
                  Stripe: {plan.stripePriceId}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                <pre>{JSON.stringify(JSON.parse(plan.featuresJson), null, 2)}</pre>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={plan.active ? "outline" : "default"}
                  onClick={() => togglePlanStatus(plan.slug, !plan.active)}
                >
                  {plan.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
