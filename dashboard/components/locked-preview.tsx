"use client"

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Teaser paywall: the real product UI (with example data) sits behind, softly
 * blurred and fully inert; the call to action floats on top. Showing the actual
 * instrument sells harder than any description of it.
 */
export function LockedPreview({ cta, children }: { cta: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none blur-[3px] saturate-[0.85]">
        {children}
      </div>
      {/* Scrim: keeps the mock legible at the top, settles to canvas at the bottom */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/20 via-background/55 to-background/85" />
      {/* The CTA rides the scroll (sticky within the preview's height) so it is
          never cut off no matter how tall the mock behind it is. It defaults to
          the middle of the viewport: sticky at 50vh, pulled up by half its own
          height. */}
      <div className="absolute inset-0 z-20">
        <div className="pointer-events-none sticky top-[50vh] flex justify-center px-6">
          <div className="pointer-events-auto -translate-y-1/2 animate-rise-in">{cta}</div>
        </div>
      </div>
    </div>
  )
}

/** The floating card inside a LockedPreview: same anatomy as StateCard, sized for an overlay. */
export function LockedCta({
  icon,
  tone = 'accent',
  title,
  message,
  actions,
  footnote,
}: {
  icon: ReactNode
  tone?: 'accent' | 'elite'
  title: ReactNode
  message?: ReactNode
  actions?: ReactNode
  footnote?: ReactNode
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border bg-card/95 px-7 py-8 text-center shadow-[0_24px_60px_-24px_hsl(230_60%_3%/0.9)] backdrop-blur">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg [&_svg]:h-5 [&_svg]:w-5",
          tone === 'elite' ? "bg-elite/10 text-elite" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {message ? <p className="text-sm leading-relaxed text-muted-foreground">{message}</p> : null}
      {actions ? <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
      {footnote ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70">{footnote}</p> : null}
    </div>
  )
}
