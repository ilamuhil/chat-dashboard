'use client'

import { Badge } from '@/components/ui/badge'
import {
  CalendarIcon,
  SparklesIcon,
  BotIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { Bot } from '../interactions/action'

type Props = {
  bots: Bot[]
  onSelectBot: (bot: Bot) => void
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatRole = (role: string | null) => {
  if (!role) return 'Not set'
  return role
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function BotSelectionGrid({ bots, onSelectBot }: Props) {
  return (
    <div className='space-y-5'>
      <div className='flex items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold tracking-tight text-foreground'>
            Select a bot to train
          </h2>
          <p className='text-xs text-muted-foreground'>
            Choose which bot should learn from your URLs and documents.
          </p>
        </div>
        <span className='shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>
          {bots.length} {bots.length === 1 ? 'bot' : 'bots'}
        </span>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {bots.map(bot => (
          <button
            key={bot.id}
            type='button'
            onClick={() => onSelectBot(bot)}
            className='dashboard-surface group relative flex w-full flex-col overflow-hidden rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'>
            <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-300/60 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100' />

            <div className='mb-3 flex items-start justify-between gap-3'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
                  <BotIcon className='size-4' />
                </div>
                <div className='min-w-0'>
                  <h3 className='truncate text-sm font-semibold text-foreground'>
                    {bot.name}
                  </h3>
                  {bot.role && (
                    <p className='truncate text-xs text-muted-foreground'>
                      {formatRole(bot.role)}
                    </p>
                  )}
                </div>
              </div>
              <div className='flex shrink-0 items-center gap-1.5'>
                {bot.capture_leads && (
                  <Badge
                    variant='outline'
                    className='rounded-md border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700'>
                    Leads
                  </Badge>
                )}
                <ChevronRightIcon className='size-4 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-sky-500' />
              </div>
            </div>

            <div className='mb-3 space-y-2'>
              {bot.tone && (
                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                  <SparklesIcon className='size-3.5 shrink-0 text-slate-400' />
                  <span>Tone</span>
                  <span className='font-medium capitalize text-foreground'>
                    {bot.tone}
                  </span>
                </div>
              )}
              {bot.business_description ? (
                <p className='line-clamp-2 text-xs leading-relaxed text-muted-foreground'>
                  {bot.business_description}
                </p>
              ) : (
                <p className='text-xs leading-relaxed text-muted-foreground/70'>
                  No description provided.
                </p>
              )}
            </div>

            <div className='mt-auto flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-muted-foreground'>
              <CalendarIcon className='size-3.5 shrink-0' />
              <span>Updated {formatDate(bot.updated_at)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
