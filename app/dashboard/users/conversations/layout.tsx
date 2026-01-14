'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EllipsisVerticalIcon } from 'lucide-react'

import React from 'react'

export default function ConversationsLayout({children}: {children: React.ReactNode}) {
  const chats: Array<{
    id: string
    name: string
    email: string
    highlightSnippet: string
    date: string
  }> = []
  
  return (
    <main className='flex flex-col h-full min-h-0 overflow-hidden'>
      <header className='shrink-0'>
        <h1 className='dashboard-title'>Conversations</h1>
      </header>
      <section className='flex-1 min-h-0 mt-6 overflow-hidden'>
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
                    {chat.date}
                  </time>
                </article>
              ))}
            </nav>
          </aside>
          <>
            {children}
          </>
        </div>
      </section>
    </main>
  )
}





