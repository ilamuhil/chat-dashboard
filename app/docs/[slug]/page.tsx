import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DocsArticle } from '@/components/docs/docs-article'
import { docsPages, getDocPage } from '@/lib/docs'

const siteUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')

export function generateStaticParams() {
  return docsPages
    .filter(page => page.slug)
    .map(page => ({ slug: page.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getDocPage(slug)
  if (!page) return {}

  const path = `/docs/${page.slug}`
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path },
    openGraph: {
      title: page.title,
      description: page.description,
      url: path,
      type: 'article',
    },
  }
}

export default async function DocsTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = getDocPage(slug)
  if (!page || !page.slug) notFound()

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
      {
        '@type': 'ListItem',
        position: 3,
        name: page.title,
        item: `${siteUrl}/docs/${page.slug}`,
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
