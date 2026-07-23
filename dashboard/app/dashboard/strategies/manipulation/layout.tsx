import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Server metadata for the public teaser: the landing target for the
 * "bazaar manipulation" search intent, keyword-first title.
 */
export const metadata: Metadata = {
  title: 'Bazaar Manipulation - Thin-Market Analysis for Hypixel SkyBlock',
  description:
    'Analyze thin Hypixel SkyBlock bazaar markets: manipulation opportunities scored by cost to corner, order-book depth and exit risk. See the playbook, preview free.',
  keywords: [
    'bazaar manipulation', 'hypixel bazaar manipulation', 'skyblock market manipulation',
    'corner the bazaar', 'skyblock bazaar strategy',
  ],
}

export default function ManipulationLayout({ children }: { children: ReactNode }) {
  return children
}
