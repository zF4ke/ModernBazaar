import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Server-generated metadata for the public item pages: each of the ~1,900
 * bazaar items gets a real <title> and description with live prices, so search
 * engines and link unfurlers see the item, not a generic dashboard shell.
 * The page itself stays client-rendered.
 */
export async function generateMetadata(
  { params }: { params: Promise<{ productId: string }> }
): Promise<Metadata> {
  const { productId } = await params
  const fallbackName = productId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

  try {
    const base = process.env.BACKEND_URL || 'http://localhost:8080'
    const res = await fetch(`${base}/api/bazaar/items/${productId}`, { next: { revalidate: 300 } })
    if (res.ok) {
      const item = await res.json()
      const name = item?.snapshot?.displayName || fallbackName
      const buy = item?.snapshot?.instantBuyPrice
      const sell = item?.snapshot?.instantSellPrice
      const priceLine = Number.isFinite(buy) && Number.isFinite(sell)
        ? `Instant buy ${Math.round(buy).toLocaleString('en-US')} coins, instant sell ${Math.round(sell).toLocaleString('en-US')} coins. `
        : ''
      return {
        title: `${name} Bazaar Price`,
        description: `${priceLine}Live Hypixel SkyBlock bazaar price, spread and order history for ${name} on Modern Bazaar.`,
      }
    }
  } catch {
    // Backend unreachable at render time: fall through to the generic tags.
  }

  return {
    title: `${fallbackName} Bazaar Price`,
    description: `Live Hypixel SkyBlock bazaar price, spread and order history for ${fallbackName} on Modern Bazaar.`,
  }
}

export default function BazaarItemLayout({ children }: { children: ReactNode }) {
  return children
}
