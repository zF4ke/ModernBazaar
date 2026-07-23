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
    { url: `${SITE}/dashboard/bazaar-items`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE}/dashboard/skyblock-items`, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE}/terms`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/privacy`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/refund`, changeFrequency: 'monthly', priority: 0.2 },
    { url: `${SITE}/contact`, changeFrequency: 'monthly', priority: 0.2 },
  ]

  try {
    const res = await fetch(`${BACKEND}/api/bazaar/items?limit=2000`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const items: MetadataRoute.Sitemap = (data?.items ?? [])
        .map((it: any) => it?.snapshot?.productId || it?.productId)
        .filter(Boolean)
        .map((id: string) => ({
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
