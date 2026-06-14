"use client"

import { useUser } from '@auth0/nextjs-auth0'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User, LogOut, Mail, CheckCircle, Crown, CreditCard, Calendar, Rocket,
  Shuffle, Crosshair, BarChart3, Lock, ArrowRight, Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useBackendQuery } from '@/hooks/use-backend-query'
import { LoginCheck } from '@/components/login-check'
import { PERMISSIONS } from '@/constants/permissions'
import type { UserPermissions } from '@/types/permissions'

const TOOLS = [
  { name: "Bazaar Flipping", scope: PERMISSIONS.USE_BAZAAR_FLIPPING, icon: Shuffle, accent: "text-emerald-400", tint: "bg-emerald-500/15" },
  { name: "Bazaar Manipulation", scope: PERMISSIONS.USE_BAZAAR_MANIPULATION, icon: Crosshair, accent: "text-blue-400", tint: "bg-blue-500/15" },
  { name: "Market data", scope: PERMISSIONS.READ_MARKET_DATA, icon: BarChart3, accent: "text-violet-400", tint: "bg-violet-500/15" },
]

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

export default function ProfilePage() {
  const { user } = useUser()
  const isAuthenticated = !!user

  const { data: subscription, isLoading: subLoading } = useBackendQuery<{
    planName: string; status: string; currentPeriodStart: string; currentPeriodEnd: string; features: string[]
  }>('/api/me/subscription', { enabled: isAuthenticated, requireAuth: true, queryKey: ['subscription'] })

  const { data: perms } = useBackendQuery<UserPermissions>(
    '/api/me/permissions', { enabled: isAuthenticated, requireAuth: true, queryKey: ['permissions'] }
  )
  const has = (scope: string) => (perms?.permissions as string[] | undefined)?.includes(scope) ?? false

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const planName = subscription?.planName || 'Free Plan'
  const active = subscription?.status === 'active'

  return (
    <LoginCheck
      featureName="Profile"
      featureDescription="Your account, plan and access"
      icon={<User className="h-8 w-8 text-muted-foreground" />}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h2>
          <Button variant="outline" size="sm" onClick={() => { window.location.href = "/auth/logout" }}>
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>

        {/* Identity card */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 border-2 border-border">
              <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-semibold truncate">{user?.name || 'User'}</h3>
                <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                  <Crown className="h-3 w-3 mr-1" />{planName}
                </Badge>
                {user?.email_verified && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                    <CheckCircle className="h-3 w-3 mr-1" />Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Plan */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Your plan</h3>
            </div>
            {subLoading ? (
              <div className="space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-48" /></div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-background/40 p-3">
                  <div>
                    <p className="font-medium">{planName}</p>
                    <p className="text-xs text-muted-foreground">{active ? 'Active subscription' : 'No active subscription'}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                    {active ? 'Active' : 'Free'}
                  </span>
                </div>
                {subscription?.currentPeriodStart && subscription?.currentPeriodEnd && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(subscription.currentPeriodStart)} to {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
                <Button asChild className="w-full">
                  <Link href="/#pricing"><Rocket className="h-4 w-4 mr-1" />Upgrade plan</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Access */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Your access</h3>
            </div>
            <div className="space-y-2">
              {TOOLS.map((t) => {
                const unlocked = has(t.scope)
                return (
                  <div key={t.scope} className="flex items-center gap-3 rounded-lg border bg-background/40 p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${unlocked ? t.tint : 'bg-muted'}`}>
                      <t.icon className={`h-4 w-4 ${unlocked ? t.accent : 'text-muted-foreground'}`} />
                    </div>
                    <span className="flex-1 text-sm font-medium">{t.name}</span>
                    {unlocked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle className="h-3.5 w-3.5" />Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />Locked
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Account details */}
          <div className="rounded-xl border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Account</h3>
            </div>
            <dl className="divide-y divide-border/60">
              <Row label="Name" value={user?.name || 'Not provided'} />
              <Row label="Email" value={user?.email || 'Not provided'} />
              <Row label="Email status" value={user?.email_verified ? 'Verified' : 'Unverified'} />
              <Row label="User ID" value={user?.sub || '—'} mono />
            </dl>
          </div>
        </div>
      </div>
    </LoginCheck>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={`text-sm text-right truncate ${mono ? 'font-mono text-muted-foreground' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}
