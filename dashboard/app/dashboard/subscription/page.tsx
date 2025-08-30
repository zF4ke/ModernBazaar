"use client"
import { useAuth0 } from '@auth0/auth0-react'
import { useBackendQuery } from '@/hooks/use-backend-query'
import type { Subscription, PlanDTO } from '@/types/subscription'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function SubscriptionPage() {
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently, user, isLoading: authLoading } = useAuth0()

  const { data: sub, isLoading: subLoading, error: subError, refetch: refetchSub } = useBackendQuery<Subscription>(
    '/api/me/subscription', { requireAuth: true }
  )
  const { data: plans, isLoading: plansLoading, error: plansError } = useBackendQuery<PlanDTO[]>(
    '/api/plans', { requireAuth: false }
  )

  // Show loading while Auth0 is initializing
  if (authLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Subscription</h2>
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
        <h2 className="text-2xl font-bold">Subscription</h2>
        <p>You need to login to view your subscription.</p>
        <Button onClick={() => loginWithRedirect()}>Login</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Subscription</h2>
        <p className="text-muted-foreground">Your current plan and available upgrades.</p>
      </div>

             {/* Plans Section */}
       <div className="space-y-4">
         <h3 className="text-xl font-semibold">Available Plans</h3>
         
         {plansLoading && (
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {Array.from({ length: 3 }).map((_,i)=>(
               <Card key={i}>
                 <CardHeader>
                   <Skeleton className="h-4 w-24"/>
                 </CardHeader>
                 <CardContent>
                   <Skeleton className="h-6 w-32"/>
                   <Skeleton className="h-4 w-full mt-2"/>
                 </CardContent>
               </Card>
             ))}
           </div>
         )}
         
                    {plansError && (
             <Card className="border-red-200 bg-red-50">
               <CardContent className="pt-6">
                 <p className="text-red-700 text-sm">
                   <strong>Error loading plans:</strong> {plansError.message}
                 </p>
                 <p className="text-red-600 text-xs mt-2">
                   This might be because:
                 </p>
                 <ul className="text-red-600 text-xs mt-1 ml-4 list-disc">
                   <li>No plans are configured yet (create some in Admin → Plans)</li>
                   <li>Backend is not accessible (check if it's running on port 8080)</li>
                   <li>Network connectivity issue</li>
                 </ul>
                 <div className="mt-3 space-x-2">
                   <Button 
                     size="sm" 
                     variant="outline" 
                     onClick={() => window.location.reload()}
                   >
                     Refresh Page
                   </Button>
                   <Button 
                     size="sm" 
                     variant="outline" 
                     onClick={() => window.open('/admin/plans', '_blank')}
                   >
                     Go to Admin
                   </Button>
                 </div>
               </CardContent>
             </Card>
           )}
         
         {plans && plans.length > 0 && (
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {plans.filter(p=>p.active).map(plan => {
               const isCurrent = sub && sub.planSlug === plan.slug
               let limits: any = {}
               try { limits = plan.featuresJson ? JSON.parse(plan.featuresJson) : {} } catch {}
               return (
                 <Card key={plan.slug} className={isCurrent ? 'border-primary' : ''}>
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">{plan.name}{isCurrent && <Badge variant="outline">Current</Badge>}</CardTitle>
                     <CardDescription>{plan.stripePriceId ? 'Paid plan' : 'Free plan'}</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(limits, null, 2)}</pre>
                     {!isCurrent && plan.stripePriceId && (
                       <Button size="sm" disabled>Upgrade (checkout TBD)</Button>
                     )}
                     {isCurrent && (
                       <Button size="sm" variant="outline" onClick={()=>refetchSub()}>Refresh</Button>
                     )}
                   </CardContent>
                 </Card>
               )
             })}
           </div>
         )}
         
         {plans && plans.length === 0 && (
           <Card className="border-amber-200 bg-amber-50">
             <CardContent className="pt-6">
               <p className="text-amber-700 text-sm">
                 <strong>No plans available.</strong> This usually means no subscription plans have been created yet.
               </p>
               <p className="text-amber-600 text-xs mt-2">
                 An admin needs to create plans in the Admin section before users can subscribe.
               </p>
             </CardContent>
           </Card>
         )}
       </div>

             {/* Current Subscription Section */}
       <Card>
         <CardHeader>
           <CardTitle>Current Subscription</CardTitle>
           <CardDescription>Status and metadata.</CardDescription>
         </CardHeader>
         <CardContent>
           {subLoading && <Skeleton className="h-6 w-40"/>}
           
           {subError && (
             <div className="space-y-2">
               <p className="text-red-700 text-sm">
                 <strong>Error loading subscription:</strong> {subError.message}
               </p>
               <p className="text-red-600 text-xs">
                 This might be because:
               </p>
               <ul className="text-red-600 text-xs mt-1 ml-4 list-disc">
                 <li>You don't have an active subscription yet</li>
                 <li>Authentication token is invalid or expired</li>
                 <li>Backend is not accessible</li>
                 <li>Network connectivity issue</li>
               </ul>
               <div className="mt-3 space-x-2">
                 <Button 
                   size="sm" 
                   variant="outline" 
                   onClick={() => refetchSub()}
                 >
                   Retry
                 </Button>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   onClick={() => window.location.reload()}
                 >
                   Refresh Page
                 </Button>
               </div>
             </div>
           )}
           
           {sub && (
             <div className="space-y-1 text-sm">
               <div><span className="font-medium">Plan:</span> {sub.planName || sub.planSlug}</div>
               <div><span className="font-medium">Status:</span> {sub.status}</div>
               <div><span className="font-medium">Period End:</span> {sub.currentPeriodEnd || 'n/a'}</div>
             </div>
           )}
           
           {!sub && !subLoading && !subError && (
             <div className="text-amber-700 text-sm">
               <p>No active subscription found. You might be on a free plan or need to subscribe to a plan.</p>
             </div>
           )}
         </CardContent>
       </Card>
    </div>
  )
}
