import type { Metadata } from 'next'

import { DocsArticle } from '@/components/docs/docs-article'
import { getDocPage } from '@/lib/docs'

const siteUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'AI Admissions Chatbot Documentation',
  description:
    'Set up, train, embed, and operate an AI admissions chatbot with lead capture and counsellor handoff.',
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'AI Admissions Chatbot Documentation',
    description:
      'Practical implementation guides for academic institutes and admissions teams.',
    url: '/docs',
  },
}

export default function DocsOverviewPage() {
  const page = getDocPage('')
  if (!page) return null

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documentation',
        item: `${siteUrl}/docs`,
      },
    ],
  }

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DocsArticle page={page} />
    </>
  )
}
