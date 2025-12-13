'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { EllipsisVerticalIcon, PaperclipIcon } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { SendIcon, ExpandIcon, Minimize2Icon } from 'lucide-react'
import { useRef } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export default function ConversationsPage() {
  const [expandedChat, setExpandedChat] = useState<boolean>(false)
  const chats = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: formatDistanceToNow(new Date('12/08/2025')) + ' ago',
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
    {
      id: 3,
      name: 'Jim Doe',
      email: 'jim.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
    {
      id: 4,
      name: 'John Doe',
      email: 'john.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
    {
      id: 5,
      name: 'John Doe',
      email: 'john.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
    {
      id: 6,
      name: 'John Doe',
      email: 'john.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
    {
      id: 7,
      name: 'John Doe',
      email: 'john.doe@example.com',
      highlightSnippet:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
      date: '12/08/2025',
    },
  ]
  return (
    <main className='flex flex-col h-full min-h-0'>
      <header className='shrink-0'>
        <h1 className='dashboard-title'>Conversations</h1>
      </header>
      <section className='flex-1 min-h-0 mt-6'>
        <div className='grid grid-cols-[1fr_2fr] gap-2 h-full min-h-0'>
          <aside className='bg-white rounded p-2 flex flex-col h-full overflow-hidden min-h-0'>
            <header className='flex justify-between items-center shrink-0'>
              <h2 className='text-md font-medium'>Chats</h2>
              <Button variant='icon' size='icon'>
                <EllipsisVerticalIcon />
              </Button>
            </header>
            <Input
              type='text'
              placeholder='Search chats...'
              className='mt-2 shrink-0'
            />
            <nav className='flex-1 overflow-y-auto mt-2 space-y-2 min-h-0 no-scrollbar'>
              {chats.map(chat => (
                <article
                  key={chat.id}
                  className='shadow-none rounded bg-muted p-2 cursor-pointer hover:bg-gray-200 transition-all duration-300 hover:shadow-sm'>
                  <h3 className='text-sm font-medium'>{chat.name}</h3>
                  <p className='text-xs text-muted-foreground'>{chat.email}</p>
                  <p className='text-xs text-muted-foreground line-clamp-1 max-w-[50ch]'>
                    {chat.highlightSnippet}
                  </p>
                  <time className='text-xs text-yellow-500 italic'>
                    {chat.date}
                  </time>
                </article>
              ))}
            </nav>
          </aside>
          {expandedChat && (
            <div
              className='fixed inset-0 bg-black/50 z-40 transition-opacity duration-300'
              onClick={() => setExpandedChat(false)}
            />
          )}
          <section
            className={cn(
              'bg-white rounded p-2 flex flex-col h-full overflow-hidden min-h-0 transition-all duration-300 ease-in-out',
              expandedChat
                ? 'fixed z-50 inset-4 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]'
                : 'relative'
            )}>
            <header className='flex justify-between items-center shrink-0 px-2'>
              <h2 className='text-md font-medium'>Chat with John Doe</h2>
              <p className='text-xs text-muted-foreground'>
                Email: john.doe@example.com - Phone: +1234567890
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setExpandedChat(!expandedChat)}
                    variant='icon'
                    size='icon'
                    className='bg-gray-100 hover:bg-gray-200'>
                    {!expandedChat ? <ExpandIcon /> : <Minimize2Icon />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{expandedChat ? 'Collapse chat' : 'Expand chat'}</p>
                </TooltipContent>
              </Tooltip>
            </header>
            <Separator className='my-2' />
            <ChatWindow messages={messages} />
          </section>
        </div>
      </section>
    </main>
  )
}

const messages = [
  {
    id: '1',
    content: 'Hello, how can I help you today?',
    role: 'assistant',
    createdAt: new Date(),
  },
  {
    id: '2',
    content: 'I have a question about the product.',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '3',
    content: 'Actually, I have multiple questions.',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '4',
    content: 'First, what is the product?',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '5',
    content: 'And second, what is the price?',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '6',
    content: 'Also, do you have any discounts available?',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '7',
    content:
      'Sure! The product is a widget. It costs $10, and we currently have a 20% discount for new customers.',
    role: 'assistant',
    createdAt: new Date(),
  },
  {
    id: '8',
    content: 'That sounds great!',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '9',
    content: 'Can you tell me more about the features?',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '10',
    content: 'I would also like to know about shipping options.',
    role: 'user',
    createdAt: new Date(),
  },
  {
    id: '11',
    content:
      'Of course! The widget includes advanced features like real-time synchronization, cloud backup, and 24/7 support. We offer free shipping on orders over $50. The product is available in the following colors: red, blue, green, and yellow. The product is available in the following sizes: small, medium, large, and extra large. The product is available in the following materials: wood, metal, plastic, and glass. The product is available in the following finishes: matte, glossy, and satin. The product is available in the following textures: smooth, textured, and rough. The product is available in the following patterns: solid, striped, and dotted. The product is available in the following themes: modern, classic, and rustic. The product is available in the following styles: minimalist, modern, and classic. The product is available in the following colors: red, blue, green, and yellow. The product is available in the following sizes: small, medium, large, and extra large. The product is available in the following materials: wood, metal, plastic, and glass. The product is available in the following finishes: matte, glossy, and satin. The product is available in the following textures: smooth, textured, and rough. The product is available in the following patterns: solid, striped, and dotted. The product is available in the following themes: modern, classic, and rustic. The product is available in the following styles: minimalist, modern, and classic.',
    role: 'assistant',
    createdAt: new Date(),
  },
  {
    id: '12',
    content: 'Perfect! Thank you for all the information.',
    role: 'assistant',
    createdAt: new Date(),
  },
]

type ChatWindowProps = {
  messages: Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: Date
  }>
}

const ChatWindow = (props: ChatWindowProps) => {
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
      createdAt: Date
    },
    index: number,
    messages: Array<{
      id: string
      content: string
      role: 'user' | 'assistant'
      createdAt: Date
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
              {formatDistanceToNow(message.createdAt, {
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
