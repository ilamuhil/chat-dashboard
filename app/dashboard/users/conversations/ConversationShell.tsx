"use client"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConversationsMeta } from '@/generated/prisma'
import { EllipsisVerticalIcon } from 'lucide-react'

type Chats = {
  id: string
  name: string
  email: string
  phone: string
  lastMessageAt: Date
  highlightSnippet: string
}

export default function ConversationShell(props: { chats: Chats[] }) {
  const { chats } = props

  return (
    <div className='grid grid-cols-[1fr_2fr] gap-2 h-full min-h-0'>
      <aside className='bg-white rounded p-2 flex flex-col h-full overflow-hidden min-h-0'>
        <header className='flex justify-between items-center shrink-0'>
          <h2 className='text-md font-medium'>Chats</h2>
          <Button variant='ghost' size='icon'>
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
                {formatDistanceToNow(chat.lastMessageAt, {
                  addSuffix: true,
                })}
              </time>
            </article>
          ))}
        </nav>
      </aside>
      <>
        {children}
      </>
    </div>
  )
}