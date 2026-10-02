'use client'

import { formatDistanceToNow } from 'date-fns'
import {
  ArrowRightIcon,
  BotIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Code2Icon,
  FileTextIcon,
  MessageSquareIcon,
  RefreshCwIcon,
  UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { clientApiAxios } from '@/lib/axios-client'
import {
  dashboardButtonClass,
  dashboardOutlineButtonClass,
} from '@/lib/dashboard-buttons'
import { cn } from '@/lib/utils'

type OverviewData = {
  setup: {
    botCount: number
    sourceCount: number
    apiKeyCount: number
    memberCount: number
  }
  conversations: {
    total: number
    open: number
    closed: number
    archived: number
  }
  leads: {
    total: number
    last30Days: number
    last7Days: number
  }
  training: {
    total: number
    byStatus: Record<string, number>
  }
  recentConversations: Array<{
    id: string
    name: string
    email: string | null
    status: string
    isArchived: boolean
    snippet: string | null
    lastMessageAt: string | null
    createdAt: string
  }>
}

type SummaryCardProps = {
  label: string
  value: string | number
  detail: string
  icon: React.ComponentType<{ className?: string }>
  iconClassName: string
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClassName,
}: SummaryCardProps) {
  return (
    <div className='dashboard-surface rounded-xl p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-medium text-muted-foreground'>{label}</p>
          <p className='mt-2 text-2xl font-semibold tracking-tight text-foreground'>
            {value}
          </p>
          <p className='mt-1 truncate text-[11px] text-muted-foreground'>
            {detail}
          </p>
        </div>
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            iconClassName,
          )}>
          <Icon className='size-4' />
        </div>
      </div>
    </div>
  )
}

function LoadingOverview() {
  return (
    <div className='space-y-4' aria-label='Loading overview'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {[0, 1, 2, 3].map(item => (
          <div
            key={item}
            className='h-32 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'>
            <div className='h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700' />
            <div className='mt-3 h-7 w-14 animate-pulse rounded bg-slate-200 dark:bg-slate-700' />
            <div className='mt-2 h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800' />
          </div>
        ))}
      </div>
      <div className='h-52 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900' />
    </div>
  )
}

function trainingLabel(status: string) {
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

export default function OverviewClient() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await clientApiAxios.get<OverviewData>(
        '/api/dashboard/overview',
      )
      setData(response.data)
    } catch (loadError) {
      console.error('Failed to load dashboard overview', loadError)
      setError('We could not load the overview right now.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadOverview()
    }, 0)

    return () => window.clearTimeout(loadTask)
  }, [loadOverview])

  const trainingReady = useMemo(() => {
    if (!data) return 0
    return (
      (data.training.byStatus.trained ?? 0) +
      (data.training.byStatus.complete ?? 0)
    )
  }, [data])

  if (isLoading) return <LoadingOverview />

  if (error || !data) {
    return (
      <div className='dashboard-surface flex min-h-60 flex-col items-center justify-center rounded-xl px-6 py-10 text-center'>
        <CircleAlertIcon className='size-6 text-rose-500' />
        <h2 className='mt-3 text-sm font-semibold text-foreground'>
          Overview unavailable
        </h2>
        <p className='mt-1 max-w-sm text-xs text-muted-foreground'>
          {error ?? 'Please try again in a moment.'}
        </p>
        <Button
          type='button'
          size='sm'
          className={cn(dashboardOutlineButtonClass, 'mt-4')}
          onClick={() => void loadOverview()}>
          <RefreshCwIcon className='size-3.5' />
          Try again
        </Button>
      </div>
    )
  }

  const setupSteps = [
    {
      label: 'Configure your bot',
      detail:
        data.setup.botCount > 0
          ? `${data.setup.botCount} bot${data.setup.botCount === 1 ? '' : 's'} configured`
          : 'Set its voice, opening message, and lead capture settings.',
      complete: data.setup.botCount > 0,
      href: '/dashboard/bot/interactions',
      icon: BotIcon,
    },
    {
      label: 'Add training data',
      detail:
        data.setup.sourceCount > 0
          ? `${trainingReady} of ${data.setup.sourceCount} source${data.setup.sourceCount === 1 ? '' : 's'} ready`
          : 'Add your website or admissions documents.',
      complete: data.setup.sourceCount > 0,
      href: '/dashboard/bot/training',
      icon: FileTextIcon,
    },
    {
      label: 'Embed your chatbot',
      detail:
        data.setup.apiKeyCount > 0
          ? 'An active API key is ready for your website.'
          : 'Create a bot-specific API key and copy the embed code.',
      complete: data.setup.apiKeyCount > 0,
      href: '/dashboard/bot/api',
      icon: Code2Icon,
    },
  ]

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          label='Configured bots'
          value={data.setup.botCount}
          detail='Ready to represent your organization'
          icon={BotIcon}
          iconClassName='bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200'
        />
        <SummaryCard
          label='Open conversations'
          value={data.conversations.open}
          detail={`${data.conversations.total} total conversations`}
          icon={MessageSquareIcon}
          iconClassName='bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
        />
        <SummaryCard
          label='Active leads'
          value={data.leads.total}
          detail={`${data.leads.last7Days} captured in the last 7 days`}
          icon={UsersIcon}
          iconClassName='bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
        />
        <SummaryCard
          label='Training sources'
          value={`${trainingReady}/${data.training.total}`}
          detail='Sources ready for bot responses'
          icon={FileTextIcon}
          iconClassName='bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200'
        />
      </div>

      <section className='dashboard-surface rounded-xl p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='max-w-xl'>
            <p className='text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300'>
              Getting started
            </p>
            <h2 className='mt-1 text-base font-semibold tracking-tight text-foreground'>
              Build a useful admissions assistant in three steps
            </h2>
            <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
              Configure how your bot speaks, give it trusted institute content,
              then add it to your website. You can return here to monitor the
              conversations and enquiries it collects.
            </p>
          </div>
          <Button
            asChild
            size='sm'
            className={cn(dashboardButtonClass, 'shrink-0')}>
            <Link href={setupSteps.find(step => !step.complete)?.href ?? '/dashboard/users/conversations'}>
              {setupSteps.some(step => !step.complete) ? 'Continue setup' : 'Review activity'}
              <ArrowRightIcon className='size-3.5' />
            </Link>
          </Button>
        </div>

        <div className='mt-5 grid gap-2.5 md:grid-cols-3'>
          {setupSteps.map(step => {
            const Icon = step.icon
            return (
              <Link
                key={step.label}
                href={step.href}
                className='group rounded-lg border border-slate-200/80 bg-white/70 p-3 transition-colors hover:border-sky-300 hover:bg-sky-50/60 dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10'>
                <div className='flex items-start gap-2.5'>
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-md',
                      step.complete
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                    )}>
                    {step.complete ? (
                      <CheckCircle2Icon className='size-3.5' />
                    ) : (
                      <Icon className='size-3.5' />
                    )}
                  </div>
                  <div className='min-w-0'>
                    <p className='text-xs font-semibold text-foreground'>
                      {step.label}
                    </p>
                    <p className='mt-1 text-[11px] leading-4 text-muted-foreground'>
                      {step.detail}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]'>
        <section className='dashboard-surface rounded-xl p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h2 className='text-sm font-semibold text-foreground'>
                Conversation activity
              </h2>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                A current view of the conversations your team can follow up on.
              </p>
            </div>
            <Link
              href='/dashboard/users/conversations'
              className='text-xs font-medium text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200'>
              View all
            </Link>
          </div>
          <div className='mt-4 grid grid-cols-3 gap-2'>
            {[
              ['Open', data.conversations.open, 'text-emerald-700 dark:text-emerald-300'],
              ['Closed', data.conversations.closed, 'text-slate-700 dark:text-slate-300'],
              ['Archived', data.conversations.archived, 'text-violet-700 dark:text-violet-300'],
            ].map(([label, value, className]) => (
              <div
                key={label}
                className='rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70'>
                <p className='text-[11px] text-muted-foreground'>{label}</p>
                <p className={cn('mt-0.5 text-lg font-semibold', className)}>
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className='mt-4 space-y-2'>
            {data.recentConversations.length === 0 ? (
              <div className='rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700'>
                <MessageSquareIcon className='mx-auto size-5 text-slate-400' />
                <p className='mt-2 text-xs font-medium text-foreground'>
                  No conversations yet
                </p>
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Conversations will appear after visitors use your bot.
                </p>
              </div>
            ) : (
              data.recentConversations.map(conversation => (
                <Link
                  key={conversation.id}
                  href={`/dashboard/users/conversations/${conversation.id}`}
                  className='flex items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800'>
                  <div className='flex size-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-[10px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200'>
                    {conversation.name
                      .split(/\s+/)
                      .map(part => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='truncate text-xs font-medium text-foreground'>
                        {conversation.name}
                      </p>
                      <span className='shrink-0 text-[10px] text-muted-foreground'>
                        {formatDistanceToNow(
                          new Date(
                            conversation.lastMessageAt ?? conversation.createdAt,
                          ),
                          { addSuffix: true },
                        )}
                      </span>
                    </div>
                    <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
                      {conversation.snippet ?? 'No message preview available'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className='dashboard-surface rounded-xl p-5'>
          <h2 className='text-sm font-semibold text-foreground'>
            Organization snapshot
          </h2>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            The other numbers that help your team stay oriented.
          </p>
          <dl className='mt-4 divide-y divide-slate-100 dark:divide-slate-800'>
            <div className='flex items-center justify-between gap-3 py-2.5 first:pt-0'>
              <dt className='text-xs text-muted-foreground'>Leads this month</dt>
              <dd className='text-sm font-semibold text-foreground'>
                {data.leads.last30Days}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3 py-2.5'>
              <dt className='text-xs text-muted-foreground'>Training sources</dt>
              <dd className='text-sm font-semibold text-foreground'>
                {data.training.total}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3 py-2.5'>
              <dt className='text-xs text-muted-foreground'>Active API keys</dt>
              <dd className='text-sm font-semibold text-foreground'>
                {data.setup.apiKeyCount}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3 py-2.5 last:pb-0'>
              <dt className='text-xs text-muted-foreground'>Team members</dt>
              <dd className='text-sm font-semibold text-foreground'>
                {data.setup.memberCount}
              </dd>
            </div>
          </dl>
          {Object.keys(data.training.byStatus).length > 0 && (
            <div className='mt-4 border-t border-slate-100 pt-4 dark:border-slate-800'>
              <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Training status
              </p>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {Object.entries(data.training.byStatus).map(
                  ([status, count]) => (
                    <span
                      key={status}
                      className='rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                      {trainingLabel(status)}: {count}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
