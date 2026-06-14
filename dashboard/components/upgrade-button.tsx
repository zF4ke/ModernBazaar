"use client"

import { useUser } from "@auth0/nextjs-auth0"
import { Button } from "@/components/ui/button"
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
 * Until a URL is set for the plan, the button falls back to the pricing section.
 */
const CHECKOUT_URLS: Record<string, string | undefined> = {
  flipper: process.env.NEXT_PUBLIC_LS_CHECKOUT_FLIPPER,
  elite: process.env.NEXT_PUBLIC_LS_CHECKOUT_ELITE,
}

function buildCheckoutUrl(base: string, userId?: string | null, email?: string | null) {
  const url = new URL(base)
  if (userId) url.searchParams.set("checkout[custom][user_id]", userId)
  if (email) url.searchParams.set("checkout[email]", email)
  return url.toString()
}

export function UpgradeButton({
  plan,
  children,
  ...props
}: { plan: "flipper" | "elite"; children: ReactNode } & ComponentProps<typeof Button>) {
  const { user } = useUser()
  const base = CHECKOUT_URLS[plan]

  const go = () => {
    if (base) {
      window.location.href = buildCheckoutUrl(base, user?.sub, user?.email)
    } else {
      window.location.href = "/#pricing"
    }
  }

  return (
    <Button onClick={go} {...props}>
      {children}
    </Button>
  )
}
