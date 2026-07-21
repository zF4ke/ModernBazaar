"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Page title as words on the canvas: no box, no icon chip. The sidebar already
 * carries the section identity; the page just states its name and one line of
 * what it does, with an optional actions slot on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground md:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

/**
 * The one shape for full-page states: sign-in, upgrade, error, empty. A calm
 * card, a small icon chip, a heading, ONE sentence, actions. State is conveyed
 * by the icon and color; no captions restating the heading.
 */
export function StateCard({
  icon,
  tone = 'default',
  title,
  message,
  actions,
  footnote,
  className,
}: {
  icon: ReactNode
  tone?: 'default' | 'accent' | 'destructive'
  title: ReactNode
  message?: ReactNode
  actions?: ReactNode
  footnote?: ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 px-6 py-16 text-center">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5",
            tone === 'accent' && "bg-primary/10 text-primary",
            tone === 'destructive' && "bg-destructive/10 text-destructive",
            tone === 'default' && "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {message ? <p className="text-sm leading-relaxed text-muted-foreground">{message}</p> : null}
        {actions ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        {footnote ? <p className="mt-3 text-xs text-muted-foreground/70">{footnote}</p> : null}
      </div>
    </section>
  )
}

/** Loading placeholder shaped like content: a header line and a few rows. */
export function StateSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-6", className)} aria-busy>
      <div className="space-y-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </section>
  )
}
