"use client"

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FeatureCardProps {
  children: ReactNode
  className?: string
  blur?: 'none' | 'sm' | 'md'
  backgroundStyle?: 'glass' | 'subtle' | 'flat' | 'intense'
  /** Optional bg color class (e.g. "bg-emerald-500/20") rendered as a soft corner glow. */
  glow?: string
}

const BG_PRESET: Record<NonNullable<FeatureCardProps['backgroundStyle']>, { gradient: string; solid?: string }> = {
  glass: {
    gradient: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.025) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 55%)',
    solid: 'rgba(255,255,255,0.06)'
  },
  subtle: {
    gradient: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.02) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.015) 0%, transparent 55%)',
    solid: 'rgba(255,255,255,0.03)'
  },
  flat: {
    gradient: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.008) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.006) 0%, transparent 60%)',
    solid: 'rgba(255,255,255,0.015)'
  },
  intense: {
    gradient: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.04) 0%, transparent 60%)',
    solid: 'rgba(255,255,255,0.10)'
  },
}

const BLUR_MAP: Record<NonNullable<FeatureCardProps['blur']>, string> = {
  none: '',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md'
}

export function FeatureCard({
  children,
  className,
  blur = 'sm',
  backgroundStyle = 'glass',
  glow
}: FeatureCardProps) {
  const bg = BG_PRESET[backgroundStyle]

  // Sit on the real (elevated) card surface, layer the gradient as a sheen, and
  // optionally render a soft colored glow in the corner for the "vibrant" look.
  return (
    <Card
      className={cn(
        'relative overflow-hidden border h-full flex flex-col bg-card',
        BLUR_MAP[blur],
        className
      )}
      style={{ backgroundImage: bg.gradient }}
    >
      {glow && (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-50', glow)}
        />
      )}
      <CardContent className="relative p-6 flex-1 flex flex-col">
        {children}
      </CardContent>
    </Card>
  )
}
