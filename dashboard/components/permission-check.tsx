"use client"

import { ReactNode } from 'react'
import { Button } from "@/components/ui/button"
import { Lock, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { PageHeader, StateCard, StateSkeleton } from "@/components/page-shell"
import { LockedCta } from "@/components/locked-preview"

interface PermissionCheckProps {
  requiredPermission: string
  featureName: string
  featureDescription: string
  /** Kept for call-site compatibility; the header no longer renders an icon chip. */
  icon?: ReactNode
  hasAdminAccess?: boolean
  hasPermission: boolean
  loading?: boolean
  /** Authentication/query failure; distinct from a genuine permission denial */
  error?: string | null
  onRetry?: () => void
  upgradeMessage?: string
  adminErrorDetails?: ReactNode
  /**
   * Teaser paywall: given the upgrade CTA, render a blurred mock of the real
   * page behind it (see LockedPreview). Falls back to the plain StateCard.
   */
  preview?: (cta: ReactNode) => ReactNode
  children: ReactNode
}

/* Which plan unlocks a permission, so the locked state can sell concretely. */
const PLAN_FOR_PERMISSION: Record<string, { plan: string; price: string }> = {
  "use:bazaar-flipping": { plan: "Flipper", price: "$5.99/month" },
  "use:bazaar-manipulation": { plan: "Elite", price: "$25.99/month" },
}

export function PermissionCheck({
  requiredPermission,
  featureName,
  featureDescription,
  hasAdminAccess = false,
  hasPermission,
  loading = false,
  error = null,
  onRetry,
  adminErrorDetails,
  preview,
  children
}: PermissionCheckProps) {
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader title={featureName} description={featureDescription} />
        <StateSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader title={featureName} description={featureDescription} />
        <StateCard
          icon={<RefreshCw />}
          title="Could not verify your plan"
          message={`${error}. Your subscription has not been changed.`}
          actions={
            <Button type="button" variant="outline" onClick={onRetry ?? (() => location.reload())}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  // Locked for this plan: one concrete sentence about what unlocks it.
  if (!hasPermission && !hasAdminAccess) {
    const tier = PLAN_FOR_PERMISSION[requiredPermission]
    const isElite = requiredPermission === "use:bazaar-manipulation"
    const message = tier
      ? `It's part of the ${tier.plan} plan, ${tier.price}. Upgrade and it unlocks instantly.`
      : `Upgrade your plan and it unlocks instantly.`
    const actions = (
      <>
        <Button asChild className={isElite ? "bg-elite text-white hover:bg-elite/90" : undefined}>
          <Link href="/dashboard/profile">
            Upgrade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </>
    )

    if (preview) {
      return (
        <div className="space-y-8">
          <PageHeader title={featureName} description={featureDescription} />
          {preview(
            <LockedCta
              tone={isElite ? "elite" : "accent"}
              icon={<Lock />}
              title={`${featureName} is a paid tool`}
              message={`You're looking at example data. ${message}`}
              actions={actions}
              footnote={
                isElite
                  ? "Elite has limited slots so the edge stays real. Cancel anytime."
                  : "Cancel anytime. You keep access until the end of the billing period."
              }
            />
          )}
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader title={featureName} description={featureDescription} />
        <StateCard
          tone="accent"
          icon={<Lock />}
          title={`${featureName} is a paid tool`}
          message={message}
          actions={actions}
          footnote="Cancel anytime. You keep access until the end of the billing period."
        />
      </div>
    )
  }

  // Admin without the permission: a compact diagnostic, not a celebration of red.
  if (!hasPermission && hasAdminAccess) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader title={featureName} description={featureDescription} />
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0 space-y-2">
              <h2 className="font-semibold">Access denied despite admin privileges</h2>
              <p className="text-sm text-muted-foreground">
                This account lacks <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{requiredPermission}</code>.
              </p>
              {adminErrorDetails ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{adminErrorDetails}</div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                <Button size="sm" asChild>
                  <Link href="/dashboard/admin/users">Check user plans</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return <>{children}</>
}
