import type { MetadataRoute } from 'next'

const SITE = process.env.APP_BASE_URL || 'http://localhost:3001'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/admin', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  }
}
