"use client"

import { ReactNode } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import Link from "next/link"
import { PageHeader, StateCard, StateSkeleton } from "@/components/page-shell"
import { LockedCta } from "@/components/locked-preview"

interface LoginCheckProps {
  featureName: string
  featureDescription: string
  /** Kept for call-site compatibility; the header no longer renders an icon chip. */
  icon?: ReactNode
  /**
   * Teaser paywall: given the sign-in CTA, render a blurred mock of the real
   * page behind it (see LockedPreview). Falls back to the plain StateCard.
   */
  preview?: (cta: ReactNode) => ReactNode
  children: ReactNode
}

export function LoginCheck({
  featureName,
  featureDescription,
  preview,
  children
}: LoginCheckProps) {
  const { user, isLoading } = useUser()
  const isAuthenticated = !!user

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <PageHeader title={featureName} description={featureDescription} />
        <StateSkeleton />
      </div>
    )
  }

  if (!isAuthenticated) {
    const actions = (
      <>
        <Button onClick={() => { window.location.href = "/auth/login" }}>
          <LogIn className="h-4 w-4" />
          Sign in
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
              tone="accent"
              icon={<LogIn />}
              title="Sign in to see it live"
              message={`This is ${featureName} with example data. Sign in and the real market fills it in.`}
              actions={actions}
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
          icon={<LogIn />}
          title="Sign in to continue"
          message={`${featureName} is tied to your account, so we need to know it's you.`}
          actions={actions}
        />
      </div>
    )
  }

  return <>{children}</>
}
