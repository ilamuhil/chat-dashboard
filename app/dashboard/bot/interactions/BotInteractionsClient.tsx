'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ConfigureBotForm from './ConfigureBotForm'
import type { Bot } from './action'
import {
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  SparklesIcon,
  BotIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { toast } from 'sonner'

type BotInteractionsClientProps = {
  bots: Bot[]
}

export default function BotInteractionsClient({
  bots,
}: BotInteractionsClientProps) {
  const router = useRouter()
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleBotClick = (bot: Bot) => {
    setSelectedBot(bot)
    setShowForm(true)
  }

  const handleCreateNew = () => {
    setSelectedBot(null)
    setShowForm(true)
  }

  const handleDelete = async (botId: string) => {
    const res = await fetch(`/api/bots/${botId}`, { method: 'DELETE' })
    if (!res.ok) {
      console.error('Error deleting bot:', await res.text())
      toast.error('Error deleting bot')
    } else {
      toast.success('Bot deleted successfully')
      handleFormSuccess()
    }
  }

  const handleFormSuccess = () => {
    router.refresh()
    setShowForm(false)
    setSelectedBot(null)
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

  if (showForm) {
    return (
      <div className='space-y-6'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex min-w-0 items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              type='button'
              className='h-9 shrink-0 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium shadow-sm'
              onClick={() => {
                setShowForm(false)
                setSelectedBot(null)
              }}>
              <ArrowLeftIcon className='size-3.5' />
              Back
            </Button>
            <div className='min-w-0'>
              <h2 className='truncate text-sm font-semibold text-foreground'>
                {selectedBot ? selectedBot.name : 'Create New Bot'}
              </h2>
              <p className='text-xs text-muted-foreground'>
                {selectedBot
                  ? 'Update how this bot speaks and captures leads'
                  : 'Configure personality, messages, and lead capture'}
              </p>
            </div>
          </div>
        </div>
        <ConfigureBotForm
          key={selectedBot?.id ?? 'new'}
          bot={selectedBot}
          onSuccess={handleFormSuccess}
        />
      </div>
    )
  }

  if (bots.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-linear-to-b from-slate-50/80 to-white px-4 py-16'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-slate-100 text-sky-700 shadow-sm ring-1 ring-sky-200/60'>
          <BotIcon className='size-5' />
        </div>
        <div className='max-w-sm space-y-2 text-center'>
          <p className='text-sm font-semibold text-foreground'>
            No bots configured yet
          </p>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            Create your first bot to define its tone, role, and conversation
            flow for your customers.
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className='mt-5 h-10 gap-2 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 px-4 text-sm font-medium shadow-sm hover:from-slate-900 hover:to-sky-900'>
          <PlusIcon className='size-4' />
          Create New Bot
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-5'>
      <ConfirmationDialog
        title='Delete Bot'
        description='Are you sure you want to delete this bot? Deleting this bot will delete all associated API keys, stop all widget conversations in your applications and delete all trained data.'
        open={showDeleteDialog}
        setOpen={setShowDeleteDialog}
        onConfirm={() => {
          if (!selectedBot?.id) return
          handleDelete(selectedBot.id)
        }}
      />

      <div className='flex items-end justify-between gap-4'>
        <div className='space-y-1'>
          <h2 className='text-base font-semibold tracking-tight text-foreground'>
            Your bots
          </h2>
          <p className='text-xs text-muted-foreground'>
            Select a bot to edit its personality and interaction settings.
          </p>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>
            {bots.length} {bots.length === 1 ? 'bot' : 'bots'}
          </span>
          <Button
            onClick={handleCreateNew}
            size='sm'
            className='h-9 gap-1.5 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 px-3 text-xs font-medium shadow-sm hover:from-slate-900 hover:to-sky-900'>
            <PlusIcon className='size-3.5' />
            Create Bot
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {bots.map(bot => (
          <div
            key={bot.id}
            role='button'
            tabIndex={0}
            onClick={() => handleBotClick(bot)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleBotClick(bot)
              }
            }}
            className='dashboard-surface group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'>
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
              <div className='flex shrink-0 items-center gap-1'>
                {bot.capture_leads && (
                  <Badge
                    variant='outline'
                    className='rounded-md border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700'>
                    Leads
                  </Badge>
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-7 rounded-md hover:bg-rose-50'
                  onClick={e => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                    setSelectedBot(bot)
                  }}>
                  <TrashIcon className='size-3.5 text-rose-500' />
                </Button>
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
          </div>
        ))}
      </div>
    </div>
  )
}
