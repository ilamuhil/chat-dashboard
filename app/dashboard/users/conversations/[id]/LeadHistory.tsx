'use client'

import SummaryMarkdown from '@/components/summary-markdown'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { HistoryIcon, RefreshCwIcon, ArrowUpRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { clientApiAxios } from '@/lib/axios-client'
import type { LeadChatHistory } from '@/lib/conversation-history'
import { cn } from '@/lib/utils'

export default function LeadHistory({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false)
  const searchParams = useSearchParams()
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['lead-chat-history', conversationId],
    queryFn: async ({ signal }) => {
      const response = await clientApiAxios.get<LeadChatHistory>(
        `/api/dashboard/conversations/${conversationId}/history`, { signal },
      )
      return response.data
    },
    enabled: open,
    refetchInterval: open ? 15_000 : false,
  })
  const query = searchParams.toString()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type='button' className='flex w-full shrink-0 items-center gap-2 border-b border-border px-4 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted/50'>
          <HistoryIcon className='size-4 shrink-0 text-sky-600' />
          <span className='min-w-0 flex-1'>Lead overview &amp; chat history</span>
          <ArrowUpRightIcon className='size-3.5 shrink-0' />
        </button>
      </SheetTrigger>
      <SheetContent className='w-full gap-0 sm:max-w-xl'>
        <SheetHeader className='shrink-0 border-b border-border pr-12'>
          <SheetTitle>{data?.lead.name || 'Lead overview'}</SheetTitle>
          <SheetDescription>Shared information and every chat for this lead, newest first.</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 space-y-5 overflow-y-auto p-4 text-sm'>
          {isPending ? <p role='status'>Loading lead history…</p> : isError ? (
            <p role='alert'>Could not load this lead’s history. Please refresh to retry.</p>
          ) : data ? (
            <>
              <section aria-label='Current lead details' className='rounded-lg border border-border bg-muted/30 p-3'>
                <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 break-words text-xs'>
                  <dt className='font-semibold'>Email</dt><dd>{data.lead.email || 'Not provided'}</dd>
                  <dt className='font-semibold'>Phone</dt><dd>{data.lead.phone || 'Not provided'}</dd>
                  <dt className='font-semibold'>Course</dt><dd>{data.lead.courseInterest || 'Not provided'}</dd>
                  <dt className='font-semibold'>Study mode</dt><dd>{data.lead.preferredMode || 'Not provided'}</dd>
                  <dt className='font-semibold'>Contact consent</dt><dd>{data.lead.consentToContact === true ? 'Given' : data.lead.consentToContact === false ? 'Not given' : 'Not recorded'}</dd>
                </dl>
                <SheetClose asChild>
                  <Link href={`/dashboard/users/leads/${data.lead.id}`} className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300'>
                    Open full lead profile <ArrowUpRightIcon className='size-3' />
                  </Link>
                </SheetClose>
              </section>
              <section aria-label='Consolidated lead summary'>
                <h3 className='font-semibold'>Lead summary</h3>
                <p className='mt-1 text-xs text-muted-foreground'>Combined across chats; refreshed after a conversation closes.</p>
                {data.lead.aiSummary ? <SummaryMarkdown source={data.lead.aiSummary} className='mt-3' /> : <p className='mt-3 text-sm text-muted-foreground'>The lead summary will appear after a conversation closes.</p>}
                {data.conversations.some(chat => chat.status === 'closed' && chat.summaryStatus !== 'completed') && (
                  <p role='status' className='mt-2 text-xs text-muted-foreground'>A closed chat is awaiting its summary. The lead overview may still be updating.</p>
                )}
              </section>
              <section aria-label='All chats for this lead'>
                <h3 className='mb-3 font-semibold'>Chat history · {data.conversations.length}</h3>
                <div className='space-y-3'>
                  {data.conversations.map(chat => (
                    <article key={chat.id} className={cn('rounded-lg border p-3', chat.id === conversationId ? 'border-sky-400 bg-sky-500/5' : 'border-border')}>
                      <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
                        <time dateTime={chat.createdAt}>{new Date(chat.createdAt).toLocaleString()}</time>
                        <span className='rounded bg-muted px-2 py-1 font-medium'>{chat.isArchived ? 'Archived' : chat.status === 'open' ? 'Open' : 'Closed'}</span>
                      </div>
                      <p className='mt-2 line-clamp-2 break-words text-xs text-muted-foreground'>{chat.lastMessageSnippet || 'Open chat to view the full transcript.'}</p>
                      {chat.aiSummary ? (
                        <details className='mt-3 text-xs'>
                          <summary className='cursor-pointer font-semibold'>Conversation summary</summary>
                          <SummaryMarkdown source={chat.aiSummary} className='mt-3' />
                          {(chat.status === 'open' || chat.summaryStatus !== 'completed') && <p className='mt-2 text-muted-foreground'>Previous summary; latest messages are awaiting an update.</p>}
                        </details>
                      ) : <p className='mt-2 text-xs text-muted-foreground'>{chat.status === 'open' ? 'Summary available after closing.' : 'Summary pending.'}</p>}
                      {chat.id === conversationId ? <p className='mt-3 text-xs font-semibold text-sky-700 dark:text-sky-300'>Currently viewing</p> : (
                        <SheetClose asChild>
                          <Link href={`/dashboard/users/conversations/${chat.id}${query ? `?${query}` : ''}`} className='mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300'>
                            Open chat <ArrowUpRightIcon className='size-3' />
                          </Link>
                        </SheetClose>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}
        </div>
        <div className='shrink-0 border-t border-border p-3'>
          <Button type='button' variant='outline' size='sm' disabled={isFetching} onClick={() => void refetch()}>
            <RefreshCwIcon className={cn('size-3.5', isFetching && 'animate-spin')} /> Refresh saved information
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
