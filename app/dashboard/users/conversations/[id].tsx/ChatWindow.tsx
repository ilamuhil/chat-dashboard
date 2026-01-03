"use client"

import { Button } from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {PaperclipIcon} from "lucide-react"
import {SendIcon} from "lucide-react"
import {useRef} from "react"
import {formatDistanceToNow} from "date-fns"
import {cn} from "@/lib/utils"

type ChatWindowProps = {
  messages: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    content_type: 'text' | 'file'
    created_at: Date
  }>
}

export default function ChatWindow(props: ChatWindowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // Handle file upload logic here
      console.log('Files selected:', files)
      // You can add file upload logic here
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

    // Show avatar on last message of consecutive group (for both user and assistant)
    const showAvatar =
      isLastMessage || (nextMessage && nextMessage.role !== message.role)

    // Show timestamp only on the last message of consecutive group (for both user and assistant)
    const showTimestamp =
      isLastMessage || (nextMessage && nextMessage.role !== message.role)

    // Reduce margin if next message is from the same sender
    const isConsecutive = nextMessage && nextMessage.role === message.role
    const marginBottom = isConsecutive ? 'mb-1' : 'mb-4'

    // Check if previous message is from same sender
    const hasPreviousSameSender =
      prevMessage && prevMessage.role === message.role
    // Check if next message is from same sender
    const hasNextSameSender = nextMessage && nextMessage.role === message.role

    // Determine border radius classes based on position in sequence
    let borderRadiusClasses = ''

    if (isUser) {
      if (hasNextSameSender && hasPreviousSameSender) {
        // Middle message in sequence
        borderRadiusClasses = 'rounded-3xl'
      } else if (hasNextSameSender) {
        // First message in sequence
        borderRadiusClasses = 'rounded-t-[24px] rounded-b-3xl'
      } else if (hasPreviousSameSender) {
        // Last message in sequence - rounded bottom with tail
        borderRadiusClasses = 'rounded-b-[24px] rounded-br-md rounded-t-3xl'
      } else {
        // Single message - full rounding with tail
        borderRadiusClasses = 'rounded-[24px] rounded-br-md'
      }
    } else {
      if (hasNextSameSender && hasPreviousSameSender) {
        // Middle message in sequence - minimal rounding, no tail
        borderRadiusClasses = 'rounded-3xl'
      } else if (hasNextSameSender) {
        // First message in sequence - rounded top, minimal bottom
        borderRadiusClasses = 'rounded-t-[24px] rounded-b-3xl'
      } else if (hasPreviousSameSender) {
        // Last message in sequence - rounded bottom with tail
        borderRadiusClasses = 'rounded-b-[24px] rounded-bl-md rounded-t-3xl'
      } else {
        // Single message - full rounding with tail
        borderRadiusClasses = 'rounded-[24px] rounded-bl-md'
      }
    }

    return (
      <div
        key={message.id}
        className={`flex items-end gap-2 ${marginBottom} ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}>
        {!isUser && (
          <div className={`shrink-0 ${showAvatar ? 'w-8 h-8' : 'w-8'}`}>
            {showAvatar && (
              <div className='w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-xs font-semibold'>
                AI
              </div>
            )}
          </div>
        )}
        <div
          className={`flex flex-col max-w-[75%] ${
            isUser ? 'items-end' : 'items-start'
          }`}>
          <div
            className={`${borderRadiusClasses} px-4 py-2.5 shadow-sm ${
              isUser
                ? 'bg-sky-600 text-white'
                : 'bg-white text-gray-900 border border-gray-200'
            }`}>
            <p className='text-sm leading-relaxed whitespace-pre-wrap'>
              {message.content}
            </p>
          </div>
          {showTimestamp && (
            <time className='text-xs text-muted-foreground mt-1 px-1'>
              {formatDistanceToNow(message.created_at, {
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
        'rounded p-4 bg-muted h-full flex flex-col min-h-0',
        props.expanded ? 'fixed z-50 w-dvw h-dvh inset-0' : ''
      )}>
      <div className='flex-1 overflow-y-auto no-scrollbar mb-4'>
        {props.messages.map((message, index) =>
          renderMessage(message, index, props.messages)
        )}
      </div>
      <div className='flex gap-2 shrink-0 pt-2 border-t border-gray-200'>
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
          className='shrink-0 border-gray-300 hover:bg-gray-100'>
          <PaperclipIcon className='size-4' />
        </Button>
        <Input
          type='text'
          placeholder='Type your message...'
          className='flex-1'
        />
        <Button
          variant='default'
          size='icon'
          className='bg-sky-600 hover:bg-sky-700'>
          <SendIcon className='size-4' />
        </Button>
      </div>
    </div>
  )
}