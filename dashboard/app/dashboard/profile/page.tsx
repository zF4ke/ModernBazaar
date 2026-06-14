"use client"

import { useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  LogOut, Mail, Rocket, Shuffle, Crosshair, BarChart3, Lock, CheckCircle, ArrowRight,
  Calendar, Sparkles, ShieldCheck, X, Loader2,
} from 'lucide-react'
import { useBackendQuery } from '@/hooks/use-backend-query'
import { LoginCheck } from '@/components/login-check'
import { GradientSection } from '@/components/gradient-section'
import { UpgradeButton } from '@/components/upgrade-button'
import { fetchWithBackendUrl } from '@/lib/api'
import { PERMISSIONS } from '@/constants/permissions'
import type { UserPermissions } from '@/types/permissions'

const TOOLS = [
  { name: "Bazaar Flipping", desc: "Flips ranked by our profit-per-hour score.", scope: PERMISSIONS.USE_BAZAAR_FLIPPING, icon: Shuffle, accent: "text-emerald-400", tint: "bg-emerald-500/15", glow: "bg-emerald-500/30", href: "/dashboard/strategies/flipping" },
  { name: "Bazaar Manipulation", desc: "Corner thin markets with the full playbook.", scope: PERMISSIONS.USE_BAZAAR_MANIPULATION, icon: Crosshair, accent: "text-purple-400", tint: "bg-purple-500/15", glow: "bg-purple-500/30", href: "/dashboard/strategies/manipulation" },
  { name: "Market data", desc: "Live prices and the full item catalog.", scope: PERMISSIONS.READ_MARKET_DATA, icon: BarChart3, accent: "text-sky-400", tint: "bg-sky-500/15", glow: "bg-sky-500/30", href: "/dashboard/bazaar-items" },
]

// Per-tier visual theme.
const TIER = {
  free:    { label: "Free",    glow: "bg-zinc-500/20",    ring: "ring-zinc-500/30" },
  flipper: { label: "Flipper", glow: "bg-emerald-500/25", ring: "ring-emerald-500/40" },
  elite:   { label: "Elite",   glow: "bg-purple-500/25",  ring: "ring-purple-500/40" },
} as const

const CANCEL_REASONS = [
  "Too expensive",
  "I wasn't using it enough",
  "Missing a feature I need",
  "Found a better alternative",
  "Just taking a break",
  "Other",
]

interface Sub { planSlug?: string; planName?: string; status?: string; currentPeriodEnd?: string | null }

export default function ProfilePage() {
  const { user } = useUser()
  const isAuthenticated = !!user

  const { data: subscription, isLoading: subLoading, refetch } = useBackendQuery<Sub>(
    '/api/me/subscription', { enabled: isAuthenticated, requireAuth: true, queryKey: ['subscription'] }
  )
  const { data: perms } = useBackendQuery<UserPermissions>(
    '/api/me/permissions', { enabled: isAuthenticated, requireAuth: true, queryKey: ['permissions'] }
  )
  const has = (scope: string) => (perms?.permissions as string[] | undefined)?.includes(scope) ?? false

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const slug = (subscription?.planSlug || 'free').toLowerCase()
  const tier = TIER[slug as keyof typeof TIER] ?? TIER.free
  const planName = subscription?.planName || tier.label
  const isPaid = slug === 'flipper' || slug === 'elite'
  const status = subscription?.status || 'active'
  const canceled = status === 'canceled'
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000)) : null

  // Cancel flow
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submitCancel = async () => {
    setBusy(true)
    try {
      await fetchWithBackendUrl("/api/me/subscription/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, comment }),
      })
      setDone(true)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  return (
    <LoginCheck
      featureName="Profile"
      featureDescription="Your account, plan and access"
      icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
    >
      <div className="space-y-6">
        {/* Identity */}
        <GradientSection variant="hero" padding="md" backdropBlur="none">
          <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className={`h-20 w-20 ring-2 ${tier.ring}`}>
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
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-7">
          <div className={`pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl opacity-70 ${tier.glow}`} />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current plan</p>

            {subLoading ? (
              <Skeleton className="mt-2 h-10 w-40" />
            ) : (
              <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-extrabold tracking-tight">{planName}</span>
                    {isPaid && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${canceled ? 'border-amber-500/40 text-amber-400' : 'border-emerald-500/40 text-emerald-400'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${canceled ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                        {canceled ? 'Ending' : 'Active'}
                      </span>
                    )}
                  </div>
                  {/* Time / status line */}
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    {isPaid && periodEnd ? (
                      <>
                        <Calendar className="h-4 w-4 shrink-0" />
                        {canceled
                          ? <span><span className="font-medium text-foreground">{daysLeft} days left</span> · access ends {periodEnd.toLocaleDateString()}</span>
                          : <span>Renews in <span className="font-medium text-foreground">{daysLeft} days</span> · {periodEnd.toLocaleDateString()}</span>}
                      </>
                    ) : (
                      <><Sparkles className="h-4 w-4 shrink-0 text-blue-400" /><span>You're on the free plan. Unlock the scored finder and the manipulation engine.</span></>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {isPaid ? (
                  slug === 'flipper' && (
                    <UpgradeButton plan="elite" className="shrink-0">
                      <Rocket className="h-4 w-4 mr-1.5" />Upgrade to Elite
                    </UpgradeButton>
                  )
                ) : (
                  <Button asChild className="shrink-0">
                    <Link href="/#pricing"><Rocket className="h-4 w-4 mr-1.5" />View plans</Link>
                  </Button>
                )}
              </div>
            )}

            {/* Manage / cancel (paid only) */}
            {isPaid && !subLoading && (
              <div className="mt-5 border-t pt-4">
                {done ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    Cancelled. You keep {planName} until {periodEnd?.toLocaleDateString() ?? 'the period ends'} — thanks for the feedback.
                  </p>
                ) : canceled ? (
                  <p className="text-sm text-muted-foreground">Your subscription is set to end. You can re-subscribe anytime from the <Link href="/#pricing" className="text-foreground underline underline-offset-2">pricing page</Link>.</p>
                ) : !showCancel ? (
                  <button onClick={() => setShowCancel(true)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    Cancel subscription
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border bg-background/40 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Before you go — what's the main reason?</h4>
                      <button onClick={() => setShowCancel(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CANCEL_REASONS.map((r) => (
                        <button key={r} onClick={() => setReason(r)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${reason === r ? 'border-foreground/40 bg-foreground/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <Textarea placeholder="Anything we could've done better? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Keep my plan</Button>
                      <Button variant="destructive" size="sm" onClick={submitCancel} disabled={busy}>
                        {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Cancelling…</> : 'Confirm cancellation'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">You'll keep full access until {periodEnd?.toLocaleDateString() ?? 'the end of your billing period'}.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tools / access */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your tools</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {TOOLS.map((t) => {
              const unlocked = has(t.scope)
              return (
                <div key={t.scope} className={`group relative overflow-hidden rounded-xl border bg-card p-5 transition-transform hover:-translate-y-0.5 ${unlocked ? '' : 'opacity-70'}`}>
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
              <dd className="font-mono text-muted-foreground truncate">{user?.sub || 'n/a'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </LoginCheck>
  )
}
