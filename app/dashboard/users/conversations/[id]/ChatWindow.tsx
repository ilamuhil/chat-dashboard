'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaperclipIcon, SendIcon, MessagesSquareIcon } from 'lucide-react'
import { useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

type ChatWindowProps = {
  messages: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    content_type: 'text' | 'file'
    created_at: Date
  }>
  expanded?: boolean
}

export default function ChatWindow(props: ChatWindowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      console.log('Files selected:', files)
    }
  }

  const renderMessage = (
    message: {
      id: string
      content: string
      role: 'user' | 'assistant'
      created_at: Date
    },
    index: number,
    messages: Array<{
      id: string
      content: string
      role: 'user' | 'assistant'
      created_at: Date
    }>
  ) => {
    const isUser = message.role === 'user'
    const isLastMessage = index === messages.length - 1
    const nextMessage = messages[index + 1]
    const prevMessage = messages[index - 1]

    const showAvatar =
      isLastMessage || (nextMessage && nextMessage.role !== message.role)

    const showTimestamp =
      isLastMessage || (nextMessage && nextMessage.role !== message.role)

    const isConsecutive = nextMessage && nextMessage.role === message.role
    const marginBottom = isConsecutive ? 'mb-1' : 'mb-4'

    const hasPreviousSameSender =
      prevMessage && prevMessage.role === message.role
    const hasNextSameSender = nextMessage && nextMessage.role === message.role

    let borderRadiusClasses = ''

    if (isUser) {
      if (hasNextSameSender && hasPreviousSameSender) {
        borderRadiusClasses = 'rounded-2xl'
      } else if (hasNextSameSender) {
        borderRadiusClasses = 'rounded-t-2xl rounded-b-2xl'
      } else if (hasPreviousSameSender) {
        borderRadiusClasses = 'rounded-2xl rounded-br-md'
      } else {
        borderRadiusClasses = 'rounded-2xl rounded-br-md'
      }
    } else if (hasNextSameSender && hasPreviousSameSender) {
      borderRadiusClasses = 'rounded-2xl'
    } else if (hasNextSameSender) {
      borderRadiusClasses = 'rounded-t-2xl rounded-b-2xl'
    } else if (hasPreviousSameSender) {
      borderRadiusClasses = 'rounded-2xl rounded-bl-md'
    } else {
      borderRadiusClasses = 'rounded-2xl rounded-bl-md'
    }

    return (
      <div
        key={message.id}
        className={cn(
          'flex items-end gap-2',
          marginBottom,
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}>
        {!isUser && (
          <div className={cn('shrink-0', showAvatar ? 'size-8' : 'w-8')}>
            {showAvatar && (
              <div className='flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-xs font-semibold text-white shadow-sm'>
                AI
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            'flex max-w-[75%] flex-col',
            isUser ? 'items-end' : 'items-start'
          )}>
          <div
            className={cn(
              borderRadiusClasses,
              'px-3.5 py-2.5 text-sm shadow-sm',
              isUser
                ? 'bg-linear-to-br from-sky-600 to-slate-700 text-white'
                : 'border border-slate-200/80 bg-white text-slate-900'
            )}>
            <p className='leading-relaxed whitespace-pre-wrap'>
              {message.content}
            </p>
          </div>
          {showTimestamp && (
            <time className='mt-1 px-1 text-[11px] text-muted-foreground'>
              {formatDistanceToNow(new Date(message.created_at), {
                addSuffix: true,
              })}
            </time>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col bg-linear-to-b from-slate-50/90 via-white to-sky-50/30',
        props.expanded ? 'fixed inset-0 z-50 h-dvh w-dvw' : ''
      )}>
      <div className='mb-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar'>
        {props.messages.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center text-center'>
            <div className='mb-3 flex size-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80'>
              <MessagesSquareIcon className='size-5' />
            </div>
            <p className='text-sm font-medium text-foreground'>
              No messages to show
            </p>
            <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
              Message history for this conversation will appear here.
            </p>
          </div>
        ) : (
          props.messages.map((message, index) =>
            renderMessage(message, index, props.messages)
          )
        )}
      </div>

      <div className='shrink-0 border-t border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur-sm'>
        <div className='flex items-center gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            className='hidden'
            onChange={handleFileChange}
            accept='image/*,application/pdf,.doc,.docx,.txt'
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={handleFileUpload}
            className='size-9 shrink-0 rounded-lg border-slate-200 hover:bg-slate-50'>
            <PaperclipIcon className='size-4' />
          </Button>
          <Input
            type='text'
            placeholder='Type your message…'
            className='h-9 flex-1 border-slate-200 text-sm shadow-sm'
          />
          <Button
            type='button'
            size='icon'
            className='size-9 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 shadow-sm hover:from-slate-900 hover:to-sky-900'>
            <SendIcon className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
