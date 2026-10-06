'use client'

import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  MessagesSquareIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Message } from './types'
import { renderChatMarkdown } from './markdown'
import {
  conversationEndedLabel,
  isConversationEndedMessage,
} from '../conversation-status'
import { useTypingActivity } from './useTypingActivity'

type ChatWindowProps = {
  messages: Message[]
  expanded?: boolean
  onSendMessage?: (content: string) => void
  onSendFile?: (fileName: string) => void
  uploadToken?: string | null
  onTypingActivity?: (active: boolean) => boolean
  isVisitorTyping?: boolean
  isSending?: boolean
  disabled?: boolean
  connectionError?: string | null
  closedBy?: string | null
}

function VisitorTypingIndicator() {
  return (
    <div
      className='chat-typing-indicator mt-0.5 mb-1.5 ml-3 flex h-5 w-fit items-center justify-center gap-0.5 self-start rounded-full px-1.5'
      style={
        {
          '--bounce-height': '1.5px',
          '--typing-cycle': '1.8s',
        } as React.CSSProperties
      }
      aria-live='polite'
      aria-label='Visitor is typing'>
      <div className='typing-dot typing-dot--1 h-1 w-1 rounded-full' />
      <div className='typing-dot typing-dot--2 h-1 w-1 rounded-full' />
      <div className='typing-dot typing-dot--3 h-1 w-1 rounded-full' />
    </div>
  )
}

function PaperclipIcon() {
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M16.5 6.5l-7.78 7.78a2.5 2.5 0 1 0 3.54 3.54l8.13-8.13a4 4 0 0 0-5.66-5.66L7.6 10.17a5.5 5.5 0 0 0 7.78 7.78l6.01-6.01a1 1 0 0 0-1.41-1.41l-6.01 6.01a3.5 3.5 0 1 1-4.95-4.95l6.13-6.13a2 2 0 0 1 2.83 2.83l-8.13 8.13a.5.5 0 0 1-.71-.71l7.78-7.78a1 1 0 0 0-1.42-1.42Z'
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true'>
      <path
        fill='currentColor'
        d='M3.4 20.2l18.1-8.1c.7-.3.7-1.4 0-1.7L3.4 2.3c-.7-.3-1.5.4-1.2 1.2L4.6 10l8.8 2l-8.8 2l-2.4 6.5c-.3.8.5 1.5 1.2 1.2Z'
      />
    </svg>
  )
}

async function uploadConversationFile(file: File, token: string) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  const allowedExtensions = ['pdf', 'docx', 'img', 'txt']
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error('Allowed file types are pdf, docx, img, txt')
  }

  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/conversations/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    let serverMessage: string | null = null
    try {
      const body = (await response.json()) as { error?: unknown; message?: unknown }
      serverMessage =
        typeof body.message === 'string'
          ? body.message
          : typeof body.error === 'string'
            ? body.error
            : null
    } catch {
      serverMessage = null
    }
    throw new Error(serverMessage ?? 'Failed to upload file')
  }

  return file.name
}

function isThematicBreakMessage(content: string) {
  return /^(?:\s*-\s*){3,}$/.test(content)
}

export default function ChatWindow(props: ChatWindowProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const didInitialScrollRef = useRef(false)
  const [draft, setDraft] = useState('')
  const [fileUploading, setFileUploading] = useState(false)
  const { noteTyping, stopTyping } = useTypingActivity(props.onTypingActivity)
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
    stopTyping()
    props.onSendMessage(content)
    setDraft('')
  }

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = draft.trim() ? `${element.scrollHeight}px` : '36px'
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
    props.isVisitorTyping,
  ])

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    try {
      if (!file) {
        toast.warning('No file was selected')
        return
      }
      if (!props.uploadToken) {
        throw new Error('Join the conversation before uploading a file')
      }
      setFileUploading(true)
      const fileName = await uploadConversationFile(file, props.uploadToken)
      props.onSendFile?.(fileName)
      toast.success('File uploaded successfully')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload file',
      )
    } finally {
      event.target.value = ''
      setFileUploading(false)
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
          <div className='flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3.5 py-2.5 text-xs text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'>
            <CheckCircle2Icon className='size-4 text-slate-400 dark:text-slate-400' />
            <span>
              {conversationEndedLabel(message, props.closedBy)}
            </span>
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
          'flex items-end',
          marginBottom,
          visualRole === 'user' ? 'flex-row gap-3' : 'flex-row-reverse gap-2'
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
              'chat-message-bubble',
              !hasNextSameSender &&
                (visualRole === 'user'
                  ? 'chat-message-bubble--user-tail'
                  : 'chat-message-bubble--assistant-tail'),
              'min-w-0 px-3.5 py-2.5 text-[13px] shadow-sm',
              visualRole === 'user'
                ? 'bg-[#e9e9eb] text-[#1e293b]'
                : 'bg-sky-700 text-white'
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
        'flex h-full min-h-0 flex-col bg-linear-to-b from-slate-50/90 via-white to-sky-50/30 dark:to-slate-900/40',
        props.expanded ? 'fixed inset-0 z-50 h-dvh w-dvw' : ''
      )}>
      <div className='mb-0 min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar'>
        {props.connectionError && (
          <div
            role='alert'
            className='mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200'>
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
          props.messages.map((message, index) => {
            if (
              isConversationEndedMessage(message) &&
              props.messages
                .slice(0, index)
                .some(isConversationEndedMessage)
            ) {
              return null
            }

            return renderMessage(message, index, props.messages)
          })
        )}
        <div ref={scrollAnchorRef} aria-hidden='true' />
      </div>

      {props.isVisitorTyping && <VisitorTypingIndicator />}
      <div className='shrink-0 border-t border-slate-200/60 bg-linear-to-b from-slate-50/90 to-slate-100/95 p-2.5 backdrop-blur-sm dark:border-slate-700/80 dark:from-slate-950/90 dark:to-slate-900/95'>
        <div className='flex items-end gap-2 rounded-2xl border border-slate-900/10 bg-white/80 p-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] dark:border-slate-400/20 dark:bg-slate-900/80 dark:shadow-[0_5px_18px_rgba(0,5,14,0.22)]'>
          <label
            className={cn(
              'inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-900/[0.06] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-400/15 dark:hover:text-slate-100',
              (composerDisabled || fileUploading) &&
                'pointer-events-none opacity-60',
            )}>
            <input
              className='sr-only'
              type='file'
              disabled={composerDisabled || fileUploading}
              onChange={event => void handleFileChange(event)}
            />
            <span aria-label='Add attachment'>
              {fileUploading ? (
                <LoaderCircleIcon className='size-4 animate-spin' />
              ) : (
                <PaperclipIcon />
              )}
            </span>
          </label>
          <textarea
            placeholder='Type a message…'
            title='Type a message…'
            className='h-9 min-h-9 flex-1 resize-none rounded-xl bg-transparent px-2 py-2 text-[13px] leading-5 tracking-[-0.01em] text-slate-900 outline-none placeholder:text-[13px] placeholder:text-slate-500 disabled:opacity-60 dark:text-slate-100 dark:placeholder:text-slate-400'
            value={draft}
            onChange={event => {
              const next = event.target.value
              setDraft(next)
              if (composerDisabled) return
              if (next.trim()) noteTyping()
              else stopTyping()
            }}
            rows={1}
            ref={textareaRef}
            disabled={composerDisabled}
            style={{ maxHeight: '120px' }}
            onKeyDown={event => {
              if (event.key !== 'Enter' || event.shiftKey) return
              if (event.nativeEvent.isComposing) return
              event.preventDefault()
              sendDraft()
            }}
          />
          <button
            type='button'
            aria-label='Send message'
            disabled={!draft.trim() || composerDisabled || !props.onSendMessage}
            onClick={sendDraft}
            className='inline-grid size-9 shrink-0 place-items-center rounded-full bg-sky-600 text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40'>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
