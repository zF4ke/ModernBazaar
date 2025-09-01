"use client"

import { cn } from '@/lib/utils'
import { ReactNode, ElementType } from 'react'

interface GradientSectionProps {
  children: ReactNode
  as?: ElementType
  variant?: 'hero' | 'glass' | 'subtle' | 'intense'
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  rounded?: boolean
  withBorder?: boolean
  backdropBlur?: 'none' | 'sm' | 'md'
  id?: string
}

const VARIANTS: Record<NonNullable<GradientSectionProps['variant']>, { bg: string }> = {
  hero: {
    bg: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 50%)'
  },
  glass: {
    bg: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.025) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 55%)'
  },
  subtle: {
    bg: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.02) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.015) 0%, transparent 55%)'
  },
  intense: {
    bg: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.04) 0%, transparent 60%)'
  }
}

const PADDING: Record<NonNullable<GradientSectionProps['padding']>, string> = {
  none: '',
  sm: 'p-4 md:p-5',
  md: 'p-6 md:p-8',
  lg: 'p-8 md:p-10',
  xl: 'p-12 md:p-14',
  '2xl': 'p-16 md:p-18'
}

const BLUR: Record<NonNullable<GradientSectionProps['backdropBlur']>, string> = {
  none: '',
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md'
}

export function GradientSection({
  children,
  as: Tag = 'section',
  variant = 'hero',
  className,
  padding = 'md',
  rounded = true,
  withBorder = true,
  backdropBlur = 'none',
  id
}: GradientSectionProps) {
  const v = VARIANTS[variant]
  return (
    <Tag
      id={id}
      className={cn(
        'relative overflow-hidden',
        withBorder && 'border',
        rounded && 'rounded-xl',
        PADDING[padding],
        BLUR[backdropBlur],
        className
      )}
      style={{ background: v.bg }}
    >
      {children}
    </Tag>
  )
}

