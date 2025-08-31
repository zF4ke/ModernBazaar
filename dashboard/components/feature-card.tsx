"use client"

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FeatureCardProps {
  children: ReactNode
  className?: string
  blur?: 'none' | 'sm' | 'md'
  backgroundStyle?: 'glass' | 'subtle' | 'flat' | 'intense'
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
  backgroundStyle = 'glass'
}: FeatureCardProps) {
  const bg = BG_PRESET[backgroundStyle]

  return (
    <Card
      className={cn(
        'border h-full flex flex-col',
        BLUR_MAP[blur],
        className
      )}
      style={{
        background: bg.gradient,
        backgroundColor: bg.solid
      }}
    >
      <CardContent className="p-6 flex-1 flex flex-col">
        {children}
      </CardContent>
    </Card>
  )
}
