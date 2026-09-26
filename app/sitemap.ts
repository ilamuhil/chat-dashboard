import type { MetadataRoute } from 'next'

const baseUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')

const routes = [
  '',
  '/terms',
  '/privacy',
  '/docs',
  '/docs/admissions-chatbot-setup',
  '/docs/chatbot-customization',
  '/docs/institute-knowledge',
  '/docs/website-embedding',
  '/docs/conversations-and-leads',
  '/docs/counsellor-handoff',
  '/docs/team-roles',
  '/docs/markdown-responses',
  '/docs/troubleshooting',
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
