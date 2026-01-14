'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ConfigureBotForm from './ConfigureBotForm'
import type { Bot } from './action'
import { PlusIcon, TrashIcon, CalendarIcon, MessageSquareIcon, SparklesIcon } from 'lucide-react'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { createClient } from '@/lib/supabase-client'
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
  const handleDelete = async(botId: string) => {
    //open alert dialog to confirm deletion
    const supabase = createClient()
    const { error } = await supabase.from('bots').delete().eq('id', botId)
    if (error) {
      console.error('Error deleting bot:', error)
      toast.error('Error deleting bot')
    } else {
      toast.success('Bot deleted successfully')
      handleFormSuccess()
    }
  }

  const handleFormSuccess = () => {
    // Refresh server components to fetch updated bot list
    router.refresh()
    // Close the form and return to bot list view
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

  // If form is shown, display the form
  if (showForm) {
    return (
      <div className='space-y-4'>
        <div className='flex items-center gap-4'>
          <Button
            variant='outline'
            onClick={() => {
              setShowForm(false)
              setSelectedBot(null)
            }}>
            ← Back to Bots
          </Button>
          <h2 className='text-lg font-semibold'>
            {selectedBot ? 'Edit Bot' : 'Create New Bot'}
          </h2>
        </div>
        <ConfigureBotForm bot={selectedBot} onSuccess={handleFormSuccess} />
      </div>
    )
  }

  // If no bots exist, show create new bot button
  if (bots.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 px-4'>
        <div className='text-center space-y-4 max-w-md'>
          <div className='text-muted-foreground'>
            <p className='text-lg mb-2'>No bots configured yet</p>
            <p className='text-sm'>
              Create your first bot to start interacting with your customers
            </p>
          </div>
          <Button onClick={handleCreateNew} size='lg' className='gap-2'>
            <PlusIcon className='h-4 w-4' />
            Create New Bot
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
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
      <div className='flex items-center gap-4'>
        <Button
          onClick={handleCreateNew}
          variant='default'
          size='sm'
          className='gap-2'>
          <PlusIcon className='h-4 w-4' />
          Create New Bot
        </Button>
        <p className='text-[0.65em] text-muted-foreground'>
          {bots.length} {bots.length === 1 ? 'bot' : 'bots'} configured
        </p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2'>
        {bots.map(bot => (
          <div
            key={bot.id}
            className='cursor-pointer rounded hover:border-gray-300 hover:shadow-sm transition-all duration-200 border border-gray-200 bg-white p-2'
            onClick={() => {
              handleBotClick(bot)
            }}>
            <div className='flex items-start justify-between gap-1 mb-1'>
              <h3 className='text-sm font-semibold leading-tight line-clamp-1'>
                {bot.name}
              </h3>
              <div className='flex items-center gap-1 shrink-0'>
                {bot.capture_leads && (
                  <Badge
                    variant='outline'
                    className='text-[0.65em] px-1 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 rounded-sm'>
                    Leads
                  </Badge>
                )}
                <Button 
                  type='button'
                  variant='ghost' 
                  size='icon' 
                  className='h-5 w-5 p-0'
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                    setSelectedBot(bot)
                  }}>
                  <TrashIcon className='h-3 w-3 text-red-500' />
                </Button>
              </div>
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
