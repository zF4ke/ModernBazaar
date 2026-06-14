import { cn } from "@/lib/utils"

/** Modern Bazaar mark — a bold "M" on the brand-blue tile.
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
        <linearGradient id="brandmark-tile" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#brandmark-tile)" />
      <path
        d="M15 47 V19 L32 35 L49 19 V47"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
