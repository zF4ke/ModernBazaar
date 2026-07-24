"use client"

import Link from 'next/link'
import { useBackendHealthContext } from '@/components/backend-health-provider'

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/contact', label: 'Contact' },
]

/**
 * Shared site footer. Carries the legal links and the non-affiliation /
 * read-only positioning that a payments (Merchant-of-Record) reviewer needs to
 * see: official public Hypixel API, read-only analytics, no automation/botting,
 * virtual in-game currency only, and the Hypixel/Mojang/Microsoft disclaimer.
 */
export function SiteFooter() {
  const { isOnline } = useBackendHealthContext()

  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">© 2026 Modern Bazaar. All rights reserved. 💜</div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {isOnline ? (
              <span className="inline-flex items-center gap-2 text-green-500">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                All Systems Operational
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-amber-500">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Some systems unavailable
              </span>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground/80 border-t pt-6">
          Modern Bazaar is an independent bazaar tracker and trading toolkit for Hypixel SkyBlock:
          live prices, flip finding and market analysis for 1,900+ items, built on Hypixel&apos;s
          official, public Bazaar API. It does not automate, bot, or
          modify the game in any way: you make every trade yourself, in-game. It deals only with
          virtual in-game currency and items; there is no real-money trading of game assets. Modern
          Bazaar is <strong className="font-medium text-muted-foreground">not affiliated with,
          endorsed by, or associated with</strong> Hypixel, Mojang, or Microsoft. Minecraft is a
          trademark of Mojang AB; Hypixel is a trademark of Hypixel Inc. All other trademarks are the
          property of their respective owners.
        </p>
      </div>
    </footer>
  )
}
