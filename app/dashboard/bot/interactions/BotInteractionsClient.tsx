'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ConfigureBotForm from './ConfigureBotForm'
import type { Bot } from './action'
import { PlusIcon, TrashIcon } from 'lucide-react'
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
  const handleDelete = async(botId: number) => {
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
        description='Are you sure you want to delete this bot? Deleting this bot will delete all associated API keys and stop all widget conversations in your applications.'
        open={showDeleteDialog}
        setOpen={setShowDeleteDialog}
        onConfirm={() => handleDelete(selectedBot?.id)}
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
        <p className='text-sm text-muted-foreground'>
          {bots.length} {bots.length === 1 ? 'bot' : 'bots'} configured
        </p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
        {bots.map(bot => (
          <div
            key={bot.id}
            className={`cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 bg-white p-4 rounded`}
            onClick={() => {
              handleBotClick(bot)
            }}>
            <div>
              <div className='flex justify-between items-center'>
                <div className='text-sm font-semibold leading-tight'>
                  {bot.name}
                </div>
                <Button variant='outline' size='icon' onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteDialog(true)
                  setSelectedBot(bot)
                }}>
                  <TrashIcon className='h-4 w-4' />
                </Button>
              </div>
              <div className='text-xs capitalize mt-1'>
                {bot.role?.replace('-', ' ')} • {bot.tone}
              </div>
            </div>
            <div>
              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed'>
                  {bot.business_description}
                </p>
                {bot.capture_leads && (
                  <div className='flex items-center gap-2 pt-1'>
                    <span className='px-2 py-0.5 bg-primary/15 text-primary rounded-md text-xs font-medium'>
                      Lead Capture
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
