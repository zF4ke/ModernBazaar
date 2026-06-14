import { cn } from "@/lib/utils"

/** Modern Bazaar mark — ascending market bars with an upward trend line.
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
      <rect width="64" height="64" rx="14" fill="#0a0f1e" />
      <defs>
        <linearGradient id="brandmark-bars" x1="16" y1="50" x2="48" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect x="15" y="34" width="9" height="15" rx="2.5" fill="url(#brandmark-bars)" fillOpacity="0.78" />
      <rect x="27.5" y="26" width="9" height="23" rx="2.5" fill="url(#brandmark-bars)" fillOpacity="0.9" />
      <rect x="40" y="18" width="9" height="31" rx="2.5" fill="url(#brandmark-bars)" />
      <path d="M19.5 31 L32 23 L44.5 15" stroke="#93c5fd" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="44.5" cy="15" r="3.2" fill="#bfdbfe" />
    </svg>
  )
}
