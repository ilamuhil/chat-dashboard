import type { Metadata } from 'next'

import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export const metadata: Metadata = {
  title: {
    default: 'AI Admissions Chatbot Documentation',
    template: '%s | AI Chat Bot Docs',
  },
  description:
    'Guides for setting up, training, embedding, and managing an AI admissions chatbot for an academic institute.',
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-svh bg-white'>
      <SiteHeader />
      <main className='mx-auto max-w-7xl px-4 sm:px-6 lg:flex lg:gap-10 lg:px-8'>
        <DocsSidebar />
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
