"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

/**
 * Segmented control with a sliding pill. ONE persistent thumb glides between
 * options (object permanence) instead of an active background that hops.
 * Boxes are measured on mount/resize into state; selecting only changes which
 * box the thumb uses, so the transform transition actually animates.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLButtonElement>())
  const [boxes, setBoxes] = useState<Record<string, { left: number; width: number }>>({})

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const measure = () => {
      const next: Record<string, { left: number; width: number }> = {}
      itemRefs.current.forEach((el, v) => {
        next[v] = { left: el.offsetLeft, width: el.offsetWidth }
      })
      setBoxes(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    return () => ro.disconnect()
  }, [options.length])

  const active = boxes[value]

  return (
    <div
      ref={trackRef}
      role="tablist"
      className={cn("relative inline-flex rounded-lg border bg-muted/40 p-1", className)}
    >
      {/* The thumb: slides and springs; concentric with the track (inset = p-1). */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 z-0 rounded-md bg-background shadow-[0_1px_3px_hsl(230_60%_3%/0.5),0_0_0_1px_hsl(var(--border))] transition-[transform,width,opacity] duration-300 ease-spring"
        style={{
          width: active?.width ?? 0,
          transform: `translateX(${active?.left ?? 0}px)`,
          opacity: active ? 1 : 0,
          left: 0,
        }}
      />
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            type="button"
            ref={(el) => {
              if (el) itemRefs.current.set(opt.value, el)
              else itemRefs.current.delete(opt.value)
            }}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
