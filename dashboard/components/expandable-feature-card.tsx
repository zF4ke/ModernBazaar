"use client"

import { ReactNode, useEffect, useRef, useState, createContext, useContext } from 'react'
import { Badge } from "@/components/ui/badge"
import { FeatureCard } from "@/components/feature-card"
import { cn } from "@/lib/utils"

export type FeatureStatus = "released" | "coming" | "planned"
export type Accent = 'emerald' | 'blue' | 'amber' | 'purple' | 'rose'

const AccentContext = createContext<{ text: string } | null>(null)
const GroupContext = createContext<{
  isHovering: boolean
  activeIds: Set<string>
  addActiveId: (id: string) => void
  clearActiveIds: () => void
} | null>(null)

const ACCENTS: Record<Accent, { activeBorder: string; text: string } > = {
  emerald: { activeBorder: 'border-emerald-500/50', text: 'text-emerald-500/80' },
  blue:    { activeBorder: 'border-blue-500/50',    text: 'text-blue-500/80'    },
  amber:   { activeBorder: 'border-amber-500/50',   text: 'text-amber-500/80'   },
  purple:  { activeBorder: 'border-purple-500/50',  text: 'text-purple-500/80'  },
  rose:    { activeBorder: 'border-rose-500/50',    text: 'text-rose-500/80'    },
}

export interface ExpandableFeatureCardProps {
  icon: ReactNode
  title: string
  status?: FeatureStatus
  summary: ReactNode
  details: ReactNode
  className?: string
  iconClassName?: string
  accent?: Accent
  id?: string
}

function statusBadge(status?: FeatureStatus) {
  if (!status) return null
  switch (status) {
    case "released":
      return (
        <Badge variant="outline" className="bg-green-500/15 text-green-500 border-green-500/30">Released</Badge>
      )
    case "coming":
      return (
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/40">Coming soon</Badge>
      )
    case "planned":
      return (
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/40">Planned</Badge>
      )
    default:
      return null
  }
}

export function ExpandableFeatureCard({
  icon,
  title,
  status,
  summary,
  details,
  className,
  iconClassName,
  accent = 'emerald',
  id
}: ExpandableFeatureCardProps) {
  const [focused, setFocused] = useState(false)
  const group = useContext(GroupContext)
  const accentClasses = ACCENTS[accent]

  const cardId = id ?? title

  const handleEnter = () => {
    group?.addActiveId(cardId)
  }

  const active = focused || (!!group?.activeIds?.has(cardId))

  return (
    <div className={cn("relative", className)}
         onMouseEnter={handleEnter}
         onFocus={() => { setFocused(true); group?.addActiveId(cardId) }}
         onBlur={() => setFocused(false)}
    >
      <AccentContext.Provider value={{ text: accentClasses.text }}>
        <FeatureCard className={cn(
          'transition-all ease-out hover:shadow-lg hover:scale-[1.01] hover:z-10',
          // Only color the border with the accent when expanded
          active ? accentClasses.activeBorder : '',
          // speed up close animation slightly vs. open
          active ? 'duration-300' : 'duration-150'
        )}>
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-4 w-4", iconClassName)}>{icon}</div>
                <h3 className="text-base font-semibold">{title}</h3>
              </div>
              {/* {statusBadge(status)} */}
            </div>

            <div className="flex-1" />

            <div className="text-sm text-muted-foreground mt-2">
              {summary}
            </div>

            {/* Reveal section */}
            <div className={cn(
              'mt-2 grid transition-[grid-template-rows] ease-out',
              active ? 'grid-rows-[1fr] duration-300' : 'grid-rows-[0fr] duration-150'
            )}>
              <div className="overflow-hidden">
                <div className={cn(
                  'pt-2 text-sm text-muted-foreground/90 leading-relaxed transition-all ease-out',
                  active ? 'opacity-100 translate-y-0 duration-300' : 'opacity-0 translate-y-1 duration-150'
                )}>
                  {details}
                </div>
              </div>
            </div>
          </div>
        </FeatureCard>
      </AccentContext.Provider>
    </div>
  )
}

export function Accent({ children, className }: { children: ReactNode; className?: string }) {
  const ctx = useContext(AccentContext)
  return <span className={cn('font-medium', ctx?.text, className)}>{children}</span>
}

export function ExpandableFeatureGrid({ children, className }: { children: ReactNode; className?: string }) {
  const [isHovering, setIsHovering] = useState(false)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  const addActiveId = (id: string) => {
    setActiveIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const clearActiveIds = () => setActiveIds(new Set())

  return (
    <div
      className={cn(className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); clearActiveIds() }}
    >
      <GroupContext.Provider value={{ isHovering, activeIds, addActiveId, clearActiveIds }}>
        {children}
      </GroupContext.Provider>
    </div>
  )
}

export default ExpandableFeatureCard
