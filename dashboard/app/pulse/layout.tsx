import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Market Pulse - live Hypixel SkyBlock bazaar movers',
  description:
    'The Hypixel SkyBlock bazaar right now: widest spreads, most traded items and busiest order books, updated every minute.',
}

export default function PulseLayout({ children }: { children: ReactNode }) {
  return children
}
