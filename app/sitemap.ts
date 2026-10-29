import type { MetadataRoute } from 'next'
import { docsPages } from '@/lib/docs/docs'

const baseUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')

const routes = [
  '',
  '/contact',
  '/pricing',
  '/terms',
  '/privacy',
  '/docs',
  ...docsPages.filter(page => page.slug).map(page => `/docs/${page.slug}`),
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return routes.map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/docs' ? 0.9 : 0.7,
  }))
}
