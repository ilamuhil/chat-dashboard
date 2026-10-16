'use client'

import { useMemo } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { prepareSummaryMarkdown } from '@/lib/summary-markdown'
import { cn } from '@/lib/utils'

export default function SummaryMarkdown({ source, className }: {
  source: string
  className?: string
}) {
  const html = useMemo(() => renderMarkdown(prepareSummaryMarkdown(source), { allowMedia: false }), [source])
  return <div className={cn('chat-markdown summary-markdown text-foreground', className)}
    dangerouslySetInnerHTML={{ __html: html }} />
}
