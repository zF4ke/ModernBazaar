"use client"

import { useUser } from "@auth0/nextjs-auth0"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useBackendQuery } from "@/hooks/use-backend-query"
import type { ComponentProps, ReactNode } from "react"

/**
 * Upgrade CTA that opens the Lemon Squeezy hosted checkout for a plan, passing
 * the logged-in Auth0 sub as custom_data.user_id so the webhook can attribute
 * the subscription (see core LemonSqueezyWebhookController).
 *
 * Activate by setting the per-plan checkout URLs (Lemon Squeezy → Products →
 * Share / checkout link), then redeploy the dashboard:
 *   NEXT_PUBLIC_LS_CHECKOUT_FLIPPER=https://<store>.lemonsqueezy.com/buy/<uuid>
 *   NEXT_PUBLIC_LS_CHECKOUT_ELITE=https://<store>.lemonsqueezy.com/buy/<uuid>
 *
 * Edge cases handled:
 * - Not logged in → bounce through /auth/login and resume the upgrade afterwards
 *   ({@link useUpgrade}); the webhook can't attribute an anonymous checkout.
 * - Logged in but no checkout URL configured → fall back to the dashboard.
 * - Already on this plan (or a higher one) → the button is disabled and relabelled,
 *   so the user can't start a SECOND hosted checkout (which would double-bill them,
 *   since LS checkout creates a new subscription rather than extending). Upgrading to
 *   a higher tier is still allowed; the backend webhook cancels the old lower sub.
 */
export type UpgradePlan = "flipper" | "elite"

const CHECKOUT_URLS: Record<UpgradePlan, string | undefined> = {
  flipper: process.env.NEXT_PUBLIC_LS_CHECKOUT_FLIPPER,
  elite: process.env.NEXT_PUBLIC_LS_CHECKOUT_ELITE,
}

// Tier ordering for the "already have this / a higher plan" guard.
const PLAN_RANK: Record<string, number> = { free: 0, flipper: 1, elite: 2 }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function buildCheckoutUrl(base: string, userId?: string | null, email?: string | null) {
  const url = new URL(base)
  if (userId) url.searchParams.set("checkout[custom][user_id]", userId)
  if (email) url.searchParams.set("checkout[email]", email)
  return url.toString()
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
 * Shared upgrade launcher. `start(plan)` sends the user to checkout, logging them
 * in first when needed. `resumeFromQuery()` continues an upgrade that was deferred
 * for login (the landing page calls it once auth has resolved).
 */
export function useUpgrade() {
  const { user, isLoading } = useUser()

  const start = useCallback((plan: UpgradePlan) => {
    const base = CHECKOUT_URLS[plan]

    // Not logged in: a checkout with no user_id can't be attributed by the webhook,
    // so log in first and come back to the pricing section to resume this exact plan.
    if (!user) {
      const returnTo = `/?upgrade=${plan}#pricing`
      window.location.href = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`
      return
    }

    // Logged in but no checkout link configured (e.g. local without the env vars):
    // there's nothing to buy — send them into the app rather than a dead checkout.
    if (!base) {
      window.location.href = "/dashboard"
      return
    }

    window.location.href = buildCheckoutUrl(base, user.sub, user.email)
  }, [user])

  /**
   * If the URL carries ?upgrade=<plan> (set before a login bounce) and the user is
   * now authenticated, strip the param and continue to checkout. No-op otherwise.
   */
  const resumeFromQuery = useCallback(() => {
    if (isLoading || !user || typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const plan = params.get("upgrade")
    if (plan !== "flipper" && plan !== "elite") return
    // Remove the param so a refresh / back-nav doesn't re-trigger the redirect.
    params.delete("upgrade")
    const qs = params.toString()
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}#pricing`)
    start(plan)
  }, [isLoading, user, start])

  return { start, resumeFromQuery, isLoading, isAuthenticated: !!user }
}

export function UpgradeButton({
  plan,
  children,
  ...props
}: { plan: UpgradePlan; children: ReactNode } & ComponentProps<typeof Button>) {
  const { start, isLoading } = useUpgrade()
  const { slug, rank, loading, isAuthenticated } = useCurrentPlan()
  const targetRank = PLAN_RANK[plan]

  // Only guard once we actually know a signed-in user's plan (avoid a flash that lets
  // them click before we've loaded it). Same tier → "Current plan"; higher tier → it's
  // already included. Either way: disabled, so no second checkout / double charge.
  const known = isAuthenticated && !loading
  if (known && rank >= targetRank) {
    const label = rank === targetRank ? "Current plan" : `Included in ${cap(slug)}`
    return <Button {...props} disabled aria-disabled>{label}</Button>
  }

  // Disable while a logged-in user's plan is still loading, so they can't start a
  // checkout a beat before the guard would have stopped them.
  return (
    <Button {...props} onClick={() => start(plan)} disabled={isLoading || (isAuthenticated && loading) || props.disabled}>
      {children}
    </Button>
  )
}
