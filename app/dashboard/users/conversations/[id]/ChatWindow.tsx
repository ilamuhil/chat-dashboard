'use client'

import { Button } from '@/components/ui/button'
import {
  CheckCircle2Icon,
  PaperclipIcon,
  SendIcon,
  MessagesSquareIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Message } from './types'
import { renderChatMarkdown } from './markdown'

type ChatWindowProps = {
  messages: Message[]
  expanded?: boolean
  onSendMessage?: (content: string) => void
  isSending?: boolean
  disabled?: boolean
  connectionError?: string | null
}

function isConversationEndedMessage(message: Message) {
  const endedContentTypes = [
    'end_chat',
    'chat_ended',
    'chat_closed',
    'conversation_end',
    'conversation_ended',
    'conversation_closed',
  ]

  if (endedContentTypes.includes(message.content_type)) {
    return true
  }

  return (
    message.role === 'system' &&
    /\b(?:chat|conversation)\b.*\b(?:ended|closed)\b|\b(?:ended|closed)\b.*\b(?:chat|conversation)\b|\b(?:ended|closed)\b.*\b(?:user|visitor)\b/i.test(
      message.content,
    )
  )
}

function isThematicBreakMessage(content: string) {
  return /^(?:\s*-\s*){3,}$/.test(content)
}

export default function ChatWindow(props: ChatWindowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const didInitialScrollRef = useRef(false)
  const [draft, setDraft] = useState('')
  const conversationEnded = props.messages.some(isConversationEndedMessage)
  const composerDisabled =
    props.disabled || props.isSending || conversationEnded

  const sendDraft = () => {
    const content = draft.trim()
    const contentWithoutBreakTags = content
      .replace(/<br\s*\/?>/gi, '')
      .trim()

    if (
      !contentWithoutBreakTags ||
      !props.onSendMessage ||
      composerDisabled
    ) {
      return
    }
    props.onSendMessage(content)
    setDraft('')
  }

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`
  }, [draft])

  const lastMessage = props.messages[props.messages.length - 1]
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({
      behavior: didInitialScrollRef.current ? 'smooth' : 'auto',
      block: 'end',
    })
    didInitialScrollRef.current = true
  }, [
    props.messages.length,
    lastMessage?.id,
    lastMessage?.content,
  ])

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
    message: Message,
    index: number,
    messages: Array<Message>
  ) => {
    if (isThematicBreakMessage(message.content)) {
      return (
        <div
          key={message.id}
          className='my-2 flex items-center px-3'
          role='separator'
          aria-hidden='true'>
          <hr className='chat-message-separator' />
        </div>
      )
    }

    if (isConversationEndedMessage(message)) {
      return (
        <div
          key={message.id}
          className='flex justify-center px-4 py-5'>
          <div className='flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-xs text-slate-500 shadow-sm'>
            <CheckCircle2Icon className='size-4 text-slate-400' />
            <span>Conversation ended by the visitor</span>
          </div>
        </div>
      )
    }

    const isUser = message.role === 'user'
    const visualRole = isUser ? 'user' : 'assistant'
    const isLastMessage = index === messages.length - 1
    const nextMessage = messages[index + 1]
    const prevMessage = messages[index - 1]

    const showAvatar =
      isLastMessage ||
      (nextMessage &&
        (nextMessage.role === 'user') !== (message.role === 'user'))

    const showTimestamp =
      isLastMessage ||
      (nextMessage &&
        (nextMessage.role === 'user') !== (message.role === 'user'))

    const isConsecutive =
      nextMessage &&
      (nextMessage.role === 'user') === (message.role === 'user')
    const marginBottom = isConsecutive ? 'mb-1' : 'mb-4'

    const hasPreviousSameSender =
      prevMessage &&
      (prevMessage.role === 'user') === (message.role === 'user')
    const hasNextSameSender =
      nextMessage &&
      (nextMessage.role === 'user') === (message.role === 'user')

    let borderRadiusClasses = ''

    if (visualRole === 'user') {
      if (hasNextSameSender && hasPreviousSameSender) {
        borderRadiusClasses = 'rounded-2xl'
      } else if (hasNextSameSender) {
        borderRadiusClasses = 'rounded-t-2xl rounded-b-2xl'
      } else if (hasPreviousSameSender) {
        borderRadiusClasses = 'rounded-2xl rounded-bl-md'
      } else {
        borderRadiusClasses = 'rounded-2xl rounded-bl-md'
      }
    } else if (hasNextSameSender && hasPreviousSameSender) {
      borderRadiusClasses = 'rounded-2xl'
    } else if (hasNextSameSender) {
      borderRadiusClasses = 'rounded-t-2xl rounded-b-2xl'
    } else if (hasPreviousSameSender) {
      borderRadiusClasses = 'rounded-2xl rounded-br-md'
    } else {
      borderRadiusClasses = 'rounded-2xl rounded-br-md'
    }

    return (
      <div
        key={message.id}
        className={cn(
          'flex items-end gap-2',
          marginBottom,
          visualRole === 'user' ? 'flex-row' : 'flex-row-reverse'
        )}>
        {isUser && (
          <div className={cn('shrink-0', showAvatar ? 'size-8' : 'w-8')}>
            {showAvatar && (
              <div className='flex size-8 items-center justify-center rounded-lg bg-slate-700 text-xs font-semibold text-white shadow-sm'>
                U
              </div>
            )}
          </div>
        )}
        <div
          className={cn(
            'flex max-w-[75%] flex-col',
            visualRole === 'user' ? 'items-start' : 'items-end'
          )}>
          <div
            className={cn(
              borderRadiusClasses,
              'min-w-0 px-3.5 py-2.5 text-[13px] shadow-sm',
              visualRole === 'user'
                ? 'border border-slate-200/80 bg-white text-slate-900'
                : 'bg-linear-to-br from-sky-600 to-slate-700 text-white'
            )}>
            <div
              className='chat-markdown wrap-break-word'
              dangerouslySetInnerHTML={{
                __html: renderChatMarkdown(message.content),
              }}
            />
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
        {props.connectionError && (
          <div
            role='alert'
            className='mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700'>
            {props.connectionError}
          </div>
        )}
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
        <div ref={scrollAnchorRef} aria-hidden='true' />
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
            disabled={composerDisabled}
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            onClick={handleFileUpload}
            disabled={composerDisabled}
            className='size-9 shrink-0 rounded-lg border-slate-200 hover:bg-slate-50'>
            <PaperclipIcon className='size-4' />
          </Button>
          <textarea
            placeholder='Type your message…'
            className='h-9 min-h-9 flex-1 resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50'
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={1}
            ref={textareaRef}
            disabled={composerDisabled}
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.shiftKey) return
              if (event.nativeEvent.isComposing) return
              event.preventDefault()
              sendDraft()
            }}
          />
          <Button
            type='button'
            size='icon'
            disabled={
              !draft.trim() ||
              composerDisabled ||
              !props.onSendMessage
            }
            onClick={sendDraft}
            className='size-9 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 shadow-sm hover:from-slate-900 hover:to-sky-900'>
            <SendIcon className='size-4' />
          </Button>
        </div>
      </div>
    </div>
  )
}
