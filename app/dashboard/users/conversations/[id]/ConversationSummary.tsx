'use client'

import SummaryMarkdown from '@/components/summary-markdown'
import { useEffect } from 'react'
import { conversationStatusEvent } from '../conversation-status'
import { useQuery } from '@tanstack/react-query'
import { RefreshCwIcon, SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clientApiAxios } from '@/lib/axios-client'

export type ConversationSummaryData = {
  id: string
  status: string
  closedBy: string | null
  aiSummary: string | null
  summaryStatus: string
  summaryGeneratedAt: string | null
}

export default function ConversationSummary({ conversationId, initialData, closed }: {
  conversationId: string
  initialData?: ConversationSummaryData
  closed: boolean
}) {
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ['conversation-summary', conversationId, closed],
    queryFn: async ({ signal }) => {
      const response = await clientApiAxios.get<ConversationSummaryData>(
        `/api/dashboard/conversations/${conversationId}`, { signal },
      )
      return response.data
    },
    initialData,
    refetchInterval: query => {
      const current = query.state.data
      if (!current || current.status === 'open') return 15_000
      return current.summaryStatus === 'completed' ? false : 5_000
    },
  })
  useEffect(() => {
    if (data?.status === 'closed' && !closed) {
      window.dispatchEvent(new CustomEvent(conversationStatusEvent, {
        detail: { ids: [conversationId], status: 'closed', closedBy: data.closedBy },
      }))
    }
  }, [data?.status, data?.closedBy, closed, conversationId])
  const complete = data?.status === 'closed' && data.summaryStatus === 'completed'
  const waiting = closed || data?.status === 'closed'
  return (
    <details className='shrink-0 border-b border-slate-100 px-4 py-2 dark:border-slate-800'>
      <summary className='flex cursor-pointer items-center gap-2 text-xs font-medium'>
        <SparklesIcon className='size-3.5 text-sky-600' />
        Conversation summary
        <span className='ml-auto text-[11px] font-normal text-muted-foreground'>
          {isError ? 'Unavailable' : complete ? 'Ready' : waiting ? 'Updating' : 'After chat closes'}
        </span>
      </summary>
      <div className='mt-2 max-h-48 overflow-y-auto sm:max-h-72 text-xs leading-relaxed'>
        {data?.aiSummary ? (
          <SummaryMarkdown source={data.aiSummary} />
        ) : (
          <p className='text-muted-foreground'>
            {isError ? 'Could not load the summary. Please refresh to retry.' : waiting
              ? 'The conversation summary is being prepared.'
              : 'A summary of this conversation will appear after it closes.'}
          </p>
        )}
        {data?.aiSummary && !complete && (
          <p role='status' className='mt-2 text-muted-foreground'>
            {waiting ? 'Updating with the latest messages.' : 'Previous summary. New messages will be included when this chat closes.'}
          </p>
        )}
        {data?.summaryStatus === 'failed' && (
          <p role='status' className='mt-2 text-amber-700'>Summary generation failed. Background retries are pending.</p>
        )}
        <div className='mt-2 flex items-center justify-between gap-2 text-muted-foreground'>
          <time dateTime={data?.summaryGeneratedAt ?? undefined} suppressHydrationWarning>{data?.summaryGeneratedAt ? `Updated ${new Date(data.summaryGeneratedAt).toLocaleString()}` : ''}</time>
          <Button type='button' variant='ghost' size='sm' disabled={isFetching}
            onClick={() => void refetch()} aria-label='Refresh conversation summary' className='h-7 text-xs'>
            <RefreshCwIcon className='mr-1 size-3' />Refresh
          </Button>
        </div>
      </div>
    </details>
  )
}
