"use client"

import { useUser } from "@auth0/nextjs-auth0"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useBackendQuery } from "@/hooks/use-backend-query"
import { fetchWithBackendUrl } from "@/lib/api"
import type { ComponentProps, ReactNode } from "react"

/**
 * Upgrade CTA. Creates a Stripe Checkout Session server-side (see core
 * StripeBillingController) and redirects to the returned hosted URL. The backend
 * attaches the Auth0 sub as client_reference_id / metadata so the Stripe webhook can
 * attribute the subscription. With Stripe Managed Payments enabled, Stripe is the
 * Merchant of Record and handles tax automatically.
 *
 * Edge cases handled:
 * - Not logged in → bounce through /auth/login and resume the upgrade afterwards
 *   ({@link useUpgrade}); an anonymous checkout can't be attributed.
 * - Logged in but Stripe not configured / no price set (e.g. local) → the endpoint
 *   returns no url, so we fall back to the dashboard rather than a dead checkout.
 * - Already on this plan (or a higher one) → the button is disabled and relabelled,
 *   so the user can't start a SECOND checkout (which would create a duplicate
 *   subscription). Upgrading to a higher tier is still allowed; the backend webhook
 *   cancels the old lower sub.
 */
export type UpgradePlan = "flipper" | "elite"
export type BillingInterval = "monthly" | "annual"

// Tier ordering for the "already have this / a higher plan" guard.
const PLAN_RANK: Record<string, number> = { free: 0, flipper: 1, elite: 2 }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Best-effort referral/affiliate code from the `mb_ref` cookie (set when arriving via a referral link). */
function readRefCookie(): string | undefined {
  if (typeof document === "undefined") return undefined
  const m = document.cookie.match(/(?:^|;\s*)mb_ref=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : undefined
}

/**
 * The signed-in user's current plan, from their DB subscription (the source of truth).
 * Shares the React Query cache key with the profile page so it isn't re-fetched.
 * `loading` is only true while a logged-in user's plan is in flight.
 */
function useCurrentPlan() {
  const { user } = useUser()
  const { data, isLoading } = useBackendQuery<{ planSlug?: string }>(
    "/api/me/subscription",
    { enabled: !!user, requireAuth: true, queryKey: ["subscription"] }
  )
  const slug = (data?.planSlug || "free").toLowerCase()
  return { slug, rank: PLAN_RANK[slug] ?? 0, loading: !!user && isLoading, isAuthenticated: !!user }
}

/**
 * Shared upgrade launcher. `start(plan)` creates a checkout session and sends the user
 * to Stripe, logging them in first when needed. `resumeFromQuery()` continues an upgrade
 * that was deferred for login (the landing page calls it once auth has resolved).
 */
export function useUpgrade() {
  const { user, isLoading } = useUser()

  const start = useCallback(async (plan: UpgradePlan, interval: BillingInterval = "monthly") => {
    // Not logged in: a checkout with no user_id can't be attributed by the webhook,
    // so log in first and come back to the pricing section to resume this exact plan.
    if (!user) {
      const returnTo = `/?upgrade=${plan}&interval=${interval}#pricing`
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      return
    }

    try {
      const res = await fetchWithBackendUrl("/api/me/billing/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval, ref: readRefCookie() }),
      })
      if (res.ok) {
        const data = (await res.json()) as { url?: string }
        if (data?.url) {
          window.location.href = data.url
          return
        }
      }
    } catch {
      // fall through to the dashboard fallback below
    }
    // Stripe not configured / no price / error → send them into the app, not a dead checkout.
    window.location.href = "/dashboard"
  }, [user])

  /**
   * If the URL carries ?upgrade=<plan> (set before a login bounce) and the user is
   * now authenticated, strip the params and continue to checkout. No-op otherwise.
   */
  const resumeFromQuery = useCallback(() => {
    if (isLoading || !user || typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const plan = params.get("upgrade")
    const interval = params.get("interval") === "annual" ? "annual" : "monthly"
    if (plan !== "flipper" && plan !== "elite") return
    // Remove the params so a refresh / back-nav doesn't re-trigger the redirect.
    params.delete("upgrade")
    params.delete("interval")
    const qs = params.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}#pricing`)
    start(plan, interval)
  }, [isLoading, user, start])

  return { start, resumeFromQuery, isLoading, isAuthenticated: !!user }
}

export function UpgradeButton({
  plan,
  interval = "monthly",
  children,
  ...props
}: { plan: UpgradePlan; interval?: BillingInterval; children: ReactNode } & ComponentProps<typeof Button>) {
  const { start, isLoading } = useUpgrade()
  const { slug, rank, loading, isAuthenticated } = useCurrentPlan()
  const targetRank = PLAN_RANK[plan]

  // Only guard once we actually know a signed-in user's plan (avoid a flash that lets
  // them click before we've loaded it). Same tier → "Current plan"; higher tier → it's
  // already included. Either way: disabled, so no second checkout / duplicate sub.
  const known = isAuthenticated && !loading
  if (known && rank >= targetRank) {
    const label = rank === targetRank ? "Current plan" : `Included in ${cap(slug)}`
    return <Button {...props} disabled aria-disabled>{label}</Button>
  }

  // Disable while a logged-in user's plan is still loading, so they can't start a
  // checkout a beat before the guard would have stopped them.
  return (
    <Button {...props} onClick={() => start(plan, interval)} disabled={isLoading || (isAuthenticated && loading) || props.disabled}>
      {children}
    </Button>
  )
}
