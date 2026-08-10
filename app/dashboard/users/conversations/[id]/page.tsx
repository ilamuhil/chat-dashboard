'use client'

import React, { useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ChatWindow from './ChatWindow'
import { Button } from '@/components/ui/button'
import { ExpandIcon, Minimize2Icon, MessageSquareIcon } from 'lucide-react'
import { useParams } from 'next/navigation'
import axios from 'axios'

const getAgentJwt = async (conversation_id: string) => {
  try {
    const response = await axios.post<{ token: string }>(
      '/api/auth/agent/token',
      {
        conversation_id: conversation_id,
        agent_takeover: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
    return response.data.token
  } catch (err) {
    console.error('Error minting agent jwt:', err)
    return null
  }
}

const getMessages = async (conversation_id: string, token: string) => {
  try {
    const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL
    if (!pythonApiUrl) {
      console.error('Python server URL not configured')
      return null
    }
    const response = await axios.get<{ messages: unknown[] }>(
      `${pythonApiUrl}/api/conversations/${conversation_id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data.messages
  } catch (err) {
    console.error('Error fetching messages:', err)
    return null
  }
}

export default function ConversationPage() {
  const [expandedChat, setExpandedChat] = React.useState<boolean>(false)
  const params = useParams()
  const idRaw = (params as { id?: string | string[] }).id
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw

  const [messages] = React.useState<
    Array<{
      id: string
      content: string
      role: 'user' | 'assistant'
      content_type: 'text' | 'file'
      created_at: Date
    }>
  >([])

  useEffect(() => {
    if (!id) return

    ;(async () => {
      let token = localStorage.getItem('agent_jwt')
      if (!token) {
        const minted = await getAgentJwt(id)
        if (!minted) {
          console.error('Failed to mint agent jwt')
          return
        }
        localStorage.setItem('agent_jwt', minted)
        token = minted
      }

      const msgs = await getMessages(id, token)
      if (!msgs) {
        console.error('Failed to fetch messages')
        return
      }

      console.log('Messages:', msgs)
    })()
  }, [id])

  return (
    <>
      {expandedChat && (
        <div
          className='fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] transition-opacity duration-300'
          onClick={() => setExpandedChat(false)}
        />
      )}
      <section
        className={cn(
          'dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xl transition-all duration-300 ease-in-out',
          expandedChat
            ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]'
            : 'relative'
        )}>
        <header className='flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
              <MessageSquareIcon className='size-3.5' />
            </div>
            <div className='min-w-0'>
              <h2 className='truncate text-sm font-semibold tracking-tight text-foreground'>
                Chat
              </h2>
              <p className='truncate text-xs text-muted-foreground'>
                Conversation thread
              </p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setExpandedChat(!expandedChat)}
                variant='ghost'
                size='icon'
                className='size-8 rounded-lg bg-slate-50 hover:bg-slate-100'>
                {!expandedChat ? (
                  <ExpandIcon className='size-4' />
                ) : (
                  <Minimize2Icon className='size-4' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{expandedChat ? 'Collapse chat' : 'Expand chat'}</p>
            </TooltipContent>
          </Tooltip>
        </header>
        <div className='min-h-0 flex-1'>
          <ChatWindow messages={messages} />
        </div>
      </section>
    </>
  )
}
