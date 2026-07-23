import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Server metadata for the public teaser: this page is the landing target for
 * the "bazaar flipping" search intent, so the title leads with the keyword
 * instead of the inherited generic "Dashboard".
 */
export const metadata: Metadata = {
  title: 'Bazaar Flipping - Live Flip Finder for Hypixel SkyBlock',
  description:
    'Find profitable bazaar flips in Hypixel SkyBlock: live opportunities ranked by profit-per-hour score, sized to your budget, with risk flags and fill times. Preview free.',
  keywords: [
    'bazaar flipping', 'hypixel bazaar flipping', 'skyblock bazaar flips',
    'bazaar flip finder', 'best bazaar flips', 'skyblock flipping tool',
  ],
}

export default function FlippingLayout({ children }: { children: ReactNode }) {
  return children
}
