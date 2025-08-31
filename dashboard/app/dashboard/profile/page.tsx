"use client"

import { useAuth0 } from '@auth0/auth0-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FeatureCard } from '@/components/feature-card'
import { GradientSection } from '@/components/gradient-section'
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
  BarChart3,
  CheckCircle,
  Key
} from 'lucide-react'
import { useBackendQuery } from '@/hooks/use-backend-query'

export default function ProfilePage() {
  const { user, logout, isAuthenticated } = useAuth0()

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
        <div className="text-center">
          <h2 className="text-2xl font-bold">Profile</h2>
          <p className="text-muted-foreground">Please log in to view your profile.</p>
        </div>
        <FeatureCard backgroundStyle="glass" className="max-w-sm mx-auto">
          <div className="text-center">
            <User className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sign in to access your profile and settings.</p>
          </div>
        </FeatureCard>
      </div>
    )
  }

  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with Sign Out */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
            <p className="text-muted-foreground">Manage your account settings and preferences</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Profile Overview */}
      <GradientSection variant="hero" padding="md">
        <div className="flex items-center space-x-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.picture} alt={user?.name} />
            <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold">{user?.name || 'User'}</h3>
              <Badge variant="secondary">
                <Crown className="h-3 w-3 mr-1" />
                {subscription?.planName || 'Free Plan'}
              </Badge>
              {user?.email_verified && (
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Last login: {user?.updated_at ? formatDate(user.updated_at) : 'Not available'}
            </div>
          </div>
        </div>
      </GradientSection>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Information */}
        <FeatureCard backgroundStyle="subtle">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-muted-foreground">Full Name</span>
              <span className="text-sm font-medium">{user?.name || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email || 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">User ID</span>
              <span className="text-sm font-mono text-muted-foreground">{user?.sub || 'Not available'}</span>
            </div>
          </div>
        </FeatureCard>

        {/* Subscription Details */}
        <FeatureCard backgroundStyle="subtle">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {subscriptionLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded animate-pulse" />
                <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                  <div>
                    <p className="font-medium">{subscription?.planName || 'Free Plan'}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription?.status === 'active' ? 'Active subscription' : 'No active subscription'}
                    </p>
                  </div>
                </div>

                {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Current Period</span>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                )}

                {subscription?.features && subscription.features.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Plan Features</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-6">
                      {subscription.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs border-white/20 bg-white/5">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="bg-white/10" />

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-white/5 border-white/10">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Usage
                  </Button>
                </div>
              </>
            )}
          </div>
        </FeatureCard>

        {/* Security & Settings */}
        <FeatureCard backgroundStyle="subtle">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Settings
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
              <div>
                <p className="text-sm font-medium">Email Verification</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email_verified ? 'Your email is verified' : 'Please verify your email'}
                </p>
              </div>
              <Badge variant={user?.email_verified ? "default" : "destructive"} className='bg-white/10 text-white hover:bg-white/10 hover:text-white cursor-default'>
                {user?.email_verified ? '✓ Verified' : '✗ Unverified'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start bg-white/5 border-white/10">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start bg-white/5 border-white/10 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10">
                <Shield className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </FeatureCard>

        {/* Preferences */}
        <FeatureCard backgroundStyle="subtle" className="opacity-60">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Coming Soon</p>
            <p className="text-sm text-muted-foreground">Theme, language, and timezone preferences will be available soon.</p>
          </div>
        </FeatureCard>
      </div>

      {/* Notifications Section */}
      <FeatureCard backgroundStyle="subtle" className="opacity-60">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <div className="text-center py-8">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Coming Soon</p>
          <p className="text-sm text-muted-foreground">Email notifications, price alerts, and market updates will be available soon.</p>
        </div>
      </FeatureCard>
    </div>
  )
}
