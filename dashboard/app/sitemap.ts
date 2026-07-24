import type { MetadataRoute } from 'next'

const SITE = process.env.APP_BASE_URL || 'http://localhost:3001'
const BACKEND = process.env.BACKEND_URL || 'http://localhost:8080'

/**
 * Sitemap: the static public pages plus every bazaar item page. The item pages
 * are the SEO engine (one page per tradable item, live prices).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/pulse`, changeFrequency: 'hourly', priority: 0.9 },
    // The two money keywords ("bazaar flipping", "bazaar manipulation") land here.
    { url: `${SITE}/dashboard/strategies/flipping`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/dashboard/strategies/manipulation`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/faq`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/dashboard/bazaar-items`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE}/dashboard/skyblock-items`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/refund`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/contact`, changeFrequency: 'monthly', priority: 0.2 },
  ]

  try {
    // The backend caps every request at 200 items (DoS guard), so page through
    // it: ~1,900 item pages is the whole SEO engine — a single capped request
    // would silently drop 90% of them from the sitemap.
    const ids: string[] = []
    const PAGE_SIZE = 200
    const MAX_PAGES = 20 // safety: 4,000 items ≫ the ~1,900 that exist
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(`${BACKEND}/api/bazaar/items?page=${page}&limit=${PAGE_SIZE}`, {
        next: { revalidate: 3600 },
      })
      if (!res.ok) break
      const data = await res.json()
      const batch = (data?.items ?? [])
        .map((it: any) => it?.snapshot?.productId || it?.productId)
        .filter(Boolean)
      ids.push(...batch)
      if (batch.length < PAGE_SIZE) break
    }
    if (ids.length > 0) {
      const items: MetadataRoute.Sitemap = ids.map((id: string) => ({
        url: `${SITE}/dashboard/bazaar-items/${encodeURIComponent(id)}`,
        changeFrequency: 'hourly' as const,
        priority: 0.7,
      }))
      return [...staticPages, ...items]
    }
  } catch {
    // Backend down at build/request time: ship the static pages alone.
  }
  return staticPages
}
