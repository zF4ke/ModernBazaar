import { cn } from "@/lib/utils"

/** Modern Bazaar mark — a bold upward "trending" arrow on a blue→indigo tile.
 *  Shared by the sidebar and the favicon (app/icon.svg). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Modern Bazaar"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="brandmark-tile" x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#brandmark-tile)" />
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 46 L44 20" />
        <path d="M30 20 L44 20 L44 34" />
      </g>
    </svg>
  )
}
