"use client"

import { useUser } from '@auth0/nextjs-auth0'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LogOut, Mail, Rocket, Shuffle, Crosshair, BarChart3, Lock, CheckCircle, ArrowRight,
} from 'lucide-react'
import { useBackendQuery } from '@/hooks/use-backend-query'
import { LoginCheck } from '@/components/login-check'
import { GradientSection } from '@/components/gradient-section'
import { UpgradeButton } from '@/components/upgrade-button'
import { PERMISSIONS } from '@/constants/permissions'
import type { UserPermissions } from '@/types/permissions'

const TOOLS = [
  { name: "Bazaar Flipping", desc: "Buy/sell gaps ranked by profit per hour.", scope: PERMISSIONS.USE_BAZAAR_FLIPPING, icon: Shuffle, accent: "text-emerald-400", tint: "bg-emerald-500/15", glow: "bg-emerald-500/25", href: "/dashboard/strategies/flipping" },
  { name: "Bazaar Manipulation", desc: "Corner thin markets with a full plan.", scope: PERMISSIONS.USE_BAZAAR_MANIPULATION, icon: Crosshair, accent: "text-blue-400", tint: "bg-blue-500/15", glow: "bg-blue-500/25", href: "/dashboard/strategies/manipulation" },
  { name: "Market data", desc: "Live prices and the full item catalog.", scope: PERMISSIONS.READ_MARKET_DATA, icon: BarChart3, accent: "text-violet-400", tint: "bg-violet-500/15", glow: "bg-violet-500/25", href: "/dashboard/bazaar-items" },
]

export default function ProfilePage() {
  const { user } = useUser()
  const isAuthenticated = !!user

  const { data: subscription, isLoading: subLoading } = useBackendQuery<{
    planName: string; status: string
  }>('/api/me/subscription', { enabled: isAuthenticated, requireAuth: true, queryKey: ['subscription'] })

  const { data: perms } = useBackendQuery<UserPermissions>(
    '/api/me/permissions', { enabled: isAuthenticated, requireAuth: true, queryKey: ['permissions'] }
  )
  const has = (scope: string) => (perms?.permissions as string[] | undefined)?.includes(scope) ?? false

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const planName = subscription?.planName || 'Free'
  const active = subscription?.status === 'active'

  return (
    <LoginCheck
      featureName="Profile"
      featureDescription="Your account, plan and access"
      icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
    >
      <div className="space-y-6">
        {/* Identity */}
        <GradientSection variant="hero" padding="md" backdropBlur="none">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 ring-2 ring-border">
              <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight truncate">{user?.name || 'Trader'}</h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{user?.email}</span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => { window.location.href = "/auth/logout" }}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </GradientSection>

        {/* Plan */}
        <div className="relative overflow-hidden rounded-xl border bg-card p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
              {subLoading ? (
                <Skeleton className="mt-1 h-8 w-24" />
              ) : (
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-2xl font-bold">{planName}</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                    {active ? 'Active' : 'Free tier'}
                  </span>
                </div>
              )}
            </div>
            <UpgradeButton plan="elite" className="shrink-0">
              <Rocket className="h-4 w-4 mr-1" />Upgrade plan
            </UpgradeButton>
          </div>
        </div>

        {/* Tools / access */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your tools</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TOOLS.map((t) => {
              const unlocked = has(t.scope)
              return (
                <div key={t.scope} className={`group relative overflow-hidden rounded-xl border bg-card p-5 ${unlocked ? '' : 'opacity-70'}`}>
                  {unlocked && <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-60 ${t.glow}`} />}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${unlocked ? t.tint : 'bg-muted'}`}>
                        <t.icon className={`h-5 w-5 ${unlocked ? t.accent : 'text-muted-foreground'}`} />
                      </div>
                      {unlocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400"><CheckCircle className="h-3.5 w-3.5" />Unlocked</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Locked</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-sm text-muted-foreground">{t.desc}</p>
                    {unlocked ? (
                      <Link href={t.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground">
                        Open <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <Link href="/#pricing" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        Unlock <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Account */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-3">Account</h3>
          <dl className="divide-y divide-border/60 text-sm">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium truncate">{user?.email || 'Not provided'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono text-muted-foreground truncate">{user?.sub || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </LoginCheck>
  )
}
