import { cn } from "@/lib/utils"

/** Modern Bazaar mark — a single uptrend line on a blue→indigo tile.
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
      <path d="M16 41 L31 29 L48 18" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="18" r="4.5" fill="#ffffff" />
    </svg>
  )
}
