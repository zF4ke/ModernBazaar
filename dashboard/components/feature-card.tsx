"use client"

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FeatureCardProps {
  children: ReactNode
  className?: string
  /** Legacy props kept for call-site compatibility; the surface is now always
      a clean elevated card (no sheens, no blur, no corner glows). */
  blur?: 'none' | 'sm' | 'md'
  backgroundStyle?: 'glass' | 'subtle' | 'flat' | 'intense'
  glow?: string
}

export function FeatureCard({ children, className }: FeatureCardProps) {
  return (
    <Card className={cn('relative flex h-full flex-col overflow-hidden border bg-card', className)}>
      <CardContent className="relative flex flex-1 flex-col p-6">
        {children}
      </CardContent>
    </Card>
  )
}
