'use client'

import { Badge } from '@/components/ui/badge'
import { CalendarIcon, MessageSquareIcon, SparklesIcon } from 'lucide-react'
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
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold'>Select a bot to train</h2>
        <span className='text-[0.65em] text-muted-foreground'>
          {bots.length} {bots.length === 1 ? 'bot' : 'bots'} available
        </span>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2'>
        {bots.map(bot => (
          <div
            key={bot.id}
            className='cursor-pointer rounded hover:scale-[1.02] hover:shadow-sm transition-all duration-200 border border-gray-200 bg-white p-2'
            onClick={() => onSelectBot(bot)}>
            <div className='flex items-start justify-between gap-1 mb-1'>
              <h3 className='text-sm font-semibold leading-tight line-clamp-1'>
                {bot.name}
              </h3>
              {bot.capture_leads && (
                <Badge
                  variant='outline'
                  className='text-[0.65em] px-1 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 rounded-sm'>
                  Leads
                </Badge>
              )}
            </div>
            <div className='space-y-0.5'>
              {bot.role && (
                <div className='flex items-center gap-1'>
                  <MessageSquareIcon className='size-2.5 text-muted-foreground shrink-0' />
                  <span className='text-[0.65em] text-muted-foreground'>
                    Role:
                  </span>
                  <span className='text-[0.65em] font-medium text-foreground'>
                    {formatRole(bot.role)}
                  </span>
                </div>
              )}
              {bot.tone && (
                <div className='flex items-center gap-1'>
                  <SparklesIcon className='size-2.5 text-muted-foreground shrink-0' />
                  <span className='text-[0.65em] text-muted-foreground'>
                    Tone:
                  </span>
                  <span className='text-[0.65em] font-medium text-foreground capitalize'>
                    {bot.tone}
                  </span>
                </div>
              )}
              {bot.business_description && (
                <p className='text-[0.65em] text-muted-foreground line-clamp-2 leading-tight'>
                  {bot.business_description}
                </p>
              )}
            </div>
            <div className='pt-1 mt-1 border-t flex items-center gap-1'>
              <CalendarIcon className='size-2.5 text-muted-foreground shrink-0' />
              <span className='text-[0.65em] text-muted-foreground'>
                Updated {formatDate(bot.updated_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
