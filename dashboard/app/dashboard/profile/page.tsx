"use client"

import { useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  LogOut, Mail, Rocket, Shuffle, Crosshair, BarChart3, Lock, Check, ArrowRight,
  Calendar, ShieldCheck, X, Loader2, Fingerprint, CreditCard,
} from 'lucide-react'
import { useBackendQuery } from '@/hooks/use-backend-query'
import { LoginCheck } from '@/components/login-check'
import { UpgradeButton } from '@/components/upgrade-button'
import { fetchWithBackendUrl } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { PERMISSIONS } from '@/constants/permissions'
import type { UserPermissions } from '@/types/permissions'

const TOOLS = [
  { name: "Bazaar Flipping", desc: "Flips ranked by our profit-per-hour score.", scope: PERMISSIONS.USE_BAZAAR_FLIPPING, icon: Shuffle, accent: "text-blue-400", tint: "bg-blue-500/15", href: "/dashboard/strategies/flipping" },
  { name: "Bazaar Manipulation", desc: "Corner thin markets with the full playbook.", scope: PERMISSIONS.USE_BAZAAR_MANIPULATION, icon: Crosshair, accent: "text-purple-400", tint: "bg-purple-500/15", href: "/dashboard/strategies/manipulation" },
  { name: "Market data", desc: "Live prices and the full item catalog.", scope: PERMISSIONS.READ_MARKET_DATA, icon: BarChart3, accent: "text-sky-400", tint: "bg-sky-500/15", href: "/dashboard/bazaar-items" },
]

// Per-tier theme. Solid accent colors only, no gradients.
const TIER = {
  free:    { label: "Free",    badge: "border-zinc-500/30 text-zinc-300 bg-zinc-500/10",       ring: "ring-zinc-500/30",   glow: "bg-zinc-500/15",   dot: "bg-zinc-400" },
  flipper: { label: "Flipper", badge: "border-blue-500/30 text-blue-300 bg-blue-500/10",       ring: "ring-blue-500/40",   glow: "bg-blue-500/15",   dot: "bg-blue-400" },
  elite:   { label: "Elite",   badge: "border-purple-500/30 text-purple-300 bg-purple-500/10", ring: "ring-purple-500/40", glow: "bg-purple-500/15", dot: "bg-purple-400" },
} as const

const CANCEL_REASONS = [
  "Too expensive",
  "I wasn't using it enough",
  "Missing a feature I need",
  "Found a better alternative",
  "Just taking a break",
  "Other",
]

const PROVIDERS: Record<string, string> = {
  "google-oauth2": "Google", "discord": "Discord", "github": "GitHub", "auth0": "Email & password", "windowslive": "Microsoft",
}

interface Sub { planSlug?: string; planName?: string; status?: string; currentPeriodEnd?: string | null }

export default function ProfilePage() {
  const { user } = useUser()
  const { toast } = useToast()
  const isAuthenticated = !!user

  const { data: subscription, isLoading: subLoading, refetch } = useBackendQuery<Sub>(
    '/api/me/subscription', { enabled: isAuthenticated, requireAuth: true, queryKey: ['subscription'] }
  )
  const { data: perms } = useBackendQuery<UserPermissions>(
    '/api/me/permissions', { enabled: isAuthenticated, requireAuth: true, queryKey: ['permissions'] }
  )
  const has = (scope: string) => (perms?.permissions as string[] | undefined)?.includes(scope) ?? false

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  const slug = (subscription?.planSlug || subscription?.planName || 'free').toLowerCase()
  const tier = TIER[slug as keyof typeof TIER] ?? TIER.free
  const planName = subscription?.planName || tier.label
  const isPaid = slug === 'flipper' || slug === 'elite'
  const status = subscription?.status || 'active'
  const canceled = status === 'canceled'
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / 86_400_000)) : null
  const provider = PROVIDERS[(user?.sub || '').split('|')[0]] ?? 'Single sign-on'

  // Cancel flow
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [portalBusy, setPortalBusy] = useState(false)

  // Open the Stripe Customer Portal (manage payment method, invoices, cancel). The
  // backend creates the session from the user's Stripe customer id and returns its url.
  const openPortal = async () => {
    setPortalBusy(true)
    try {
      const res = await fetchWithBackendUrl("/api/me/billing/portal-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      })
      if (res.ok) {
        const data = (await res.json()) as { url?: string }
        if (data?.url) { window.location.href = data.url; return }
      }
      toast({ title: "Couldn't open billing", description: "Please try again in a moment.", variant: "destructive" })
    } catch {
      toast({ title: "Couldn't open billing", description: "Please try again in a moment.", variant: "destructive" })
    } finally {
      setPortalBusy(false)
    }
  }

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

  const resume = async () => {
    setResuming(true)
    try {
      await fetchWithBackendUrl("/api/me/subscription/resume", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      })
      setDone(false)
      await refetch()
    } finally {
      setResuming(false)
    }
  }

  return (
    <LoginCheck
      featureName="Profile"
      featureDescription="Your account, plan and access"
      icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />}
    >
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Identity ─────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
          <div className={`pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full blur-3xl opacity-50 ${tier.glow}`} />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className={`h-20 w-20 ring-2 ${tier.ring}`}>
              <AvatarImage src={user?.picture} alt={user?.name || 'User'} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{user?.name || 'Trader'}</h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" /><span className="truncate">{user?.email}</span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => { window.location.href = "/auth/logout" }}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </div>

        {/* ── Plan & billing ───────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-6 md:p-7">
          <div className="mb-5">
            <h2 className="text-sm font-medium text-muted-foreground">Plan &amp; billing</h2>
          </div>

          {subLoading ? (
            <Skeleton className="h-10 w-44" />
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight">{planName}</span>
                  <span className="text-sm text-muted-foreground">plan</span>
                </div>
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  {isPaid ? (
                    periodEnd ? (
                      <>
                        <Calendar className="h-4 w-4 shrink-0" />
                        {canceled
                          ? <span><span className="font-medium text-foreground">{daysLeft} days</span> of access left, ending {periodEnd.toLocaleDateString()}</span>
                          : <span>Renews in <span className="font-medium text-foreground">{daysLeft} days</span>, on {periodEnd.toLocaleDateString()}</span>}
                      </>
                    ) : (
                      // Paid plan with no billing period (e.g. admin-granted) — NOT free.
                      <span>You're on the <span className="font-medium text-foreground">{planName}</span> plan with full access.</span>
                    )
                  ) : (
                    <span>You're on the free plan. Upgrade to unlock the scored finder and the manipulation engine.</span>
                  )}
                </p>
              </div>

              {isPaid ? (
                slug === 'flipper' && (
                  <UpgradeButton plan="elite" className="shrink-0">
                    <Rocket className="h-4 w-4 mr-1.5" />Upgrade to Elite
                  </UpgradeButton>
                )
              ) : (
                <Button asChild className="shrink-0">
                  <Link href="/#pricing"><Rocket className="h-4 w-4 mr-1.5" />Upgrade your plan</Link>
                </Button>
              )}
            </div>
          )}

          {/* Manage / cancel (paid only) */}
          {isPaid && !subLoading && (
            <div className="mt-6 border-t pt-4">
              {done || canceled ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      {done ? 'Cancelled — thanks for the feedback. ' : 'Your subscription is set to end. '}
                      You keep {planName} until {periodEnd?.toLocaleDateString() ?? 'the period ends'}.
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={openPortal} disabled={portalBusy}>
                      {portalBusy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Opening…</> : <><CreditCard className="h-4 w-4 mr-1.5" />Manage billing</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={resume} disabled={resuming}>
                      {resuming ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Resuming…</> : 'Resume subscription'}
                    </Button>
                  </div>
                </div>
              ) : !showCancel ? (
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="outline" size="sm" onClick={openPortal} disabled={portalBusy}>
                    {portalBusy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Opening…</> : <><CreditCard className="h-4 w-4 mr-1.5" />Manage billing</>}
                  </Button>
                  <button onClick={() => setShowCancel(true)} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
                    Cancel subscription
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Before you go, what's the main reason?</h4>
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">You'll keep full access until {periodEnd?.toLocaleDateString() ?? 'the end of your billing period'}.</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Keep my plan</Button>
                      <Button variant="destructive" size="sm" onClick={submitCancel} disabled={busy}>
                        {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Cancelling…</> : 'Confirm cancellation'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Access ───────────────────────────────────────────── */}
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Your access</h2>
            <span className="text-xs text-muted-foreground">{TOOLS.filter(t => has(t.scope)).length} of {TOOLS.length} unlocked</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {TOOLS.map((t) => {
              const unlocked = has(t.scope)
              return (
                <Link
                  key={t.scope}
                  href={unlocked ? t.href : "/#pricing"}
                  className={`group relative flex flex-col rounded-xl border bg-card p-5 transition-colors hover:border-foreground/20 ${unlocked ? '' : 'opacity-75'}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${unlocked ? t.tint : 'bg-muted'}`}>
                      <t.icon className={`h-5 w-5 ${unlocked ? t.accent : 'text-muted-foreground'}`} />
                    </div>
                    {unlocked
                      ? <Check className="h-4 w-4 text-emerald-400" />
                      : <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{t.desc}</p>
                  <span className="mt-auto pt-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    {unlocked ? 'Open' : 'Unlock'} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Account ──────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Account</h2>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="mt-0.5 truncate font-medium">{user?.email || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><Fingerprint className="h-3.5 w-3.5" />Signed in with</dt>
              <dd className="mt-0.5 font-medium">{provider}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">User ID</dt>
              <dd className="mt-0.5 truncate font-mono text-sm text-muted-foreground">{user?.sub || 'n/a'}</dd>
            </div>
          </dl>
        </div>

      </div>
    </LoginCheck>
  )
}
