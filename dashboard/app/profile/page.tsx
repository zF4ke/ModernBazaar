"use client"

import { useAuth0 } from '@auth0/auth0-react'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Mail,
  Calendar,
  Crown,
  Star,
  Activity,
  BarChart3
} from 'lucide-react'
import { useBackendQuery } from '@/hooks/use-backend-query'

/**
 * Profile page component for user account management.
 *
 * Features:
 * - User profile information
 * - Account settings
 * - Subscription details
 * - Activity history
 * - Security settings
 */
export default function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth0()
  const [activeTab, setActiveTab] = useState('profile')

  // Fetch user subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useBackendQuery<{
    planName: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    features: string[]
  }>('/api/me/subscription', {
    enabled: isAuthenticated,
    requireAuth: true
  })

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please log in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.picture} alt={user?.name} />
              <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <CardTitle className="text-2xl">{user?.name || 'User'}</CardTitle>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {subscription?.planName || 'Free Plan'}
                </Badge>
                {subscription?.status === 'active' && (
                  <Badge variant="default" className="bg-green-500">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Your account details and profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <p className="text-sm text-muted-foreground">{user?.name || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <p className="text-sm text-muted-foreground">{user?.email || 'Not provided'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{user?.sub || 'Not available'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Login</label>
                  <p className="text-sm text-muted-foreground">
                    {user?.updated_at ? formatDate(user.updated_at) : 'Not available'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Security
                </CardTitle>
                <CardDescription>
                  Manage your account security and authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email Verified</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email_verified ? 'Verified' : 'Not verified'}
                    </p>
                  </div>
                  <Badge variant={user?.email_verified ? "default" : "destructive"}>
                    {user?.email_verified ? '✓' : '✗'}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Bell className="h-4 w-4 mr-2" />
                    Notification Preferences
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700"
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Details
              </CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscriptionLoading ? (
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">{subscription?.planName || 'Free Plan'}</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription?.status === 'active' ? 'Active subscription' : 'No active subscription'}
                      </p>
                    </div>
                    <Badge variant={subscription?.status === 'active' ? "default" : "secondary"}>
                      {subscription?.status || 'Inactive'}
                    </Badge>
                  </div>

                  {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Current Period</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                      </p>
                    </div>
                  )}

                  {subscription?.features && subscription.features.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Plan Features</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {subscription.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex gap-3">
                    <Button className="flex-1">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    <Button variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Usage
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Price Alerts</p>
                    <p className="text-xs text-muted-foreground">Get notified about price changes</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Market Updates</p>
                    <p className="text-xs text-muted-foreground">Weekly market summaries</p>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferences
                </CardTitle>
                <CardDescription>
                  Customize your account preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Theme</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option>System</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option>English</option>
                    <option>Portuguese</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select className="w-full p-2 border rounded-md text-sm">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>Europe/London</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your recent account activity and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logged in</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Viewed market data</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Updated subscription</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
