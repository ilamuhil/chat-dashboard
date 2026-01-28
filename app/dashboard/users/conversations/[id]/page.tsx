"use client"

import React, { useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ChatWindow from './ChatWindow'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ExpandIcon, Minimize2Icon } from 'lucide-react'
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
          <h2 className='text-md font-medium'>Chat</h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setExpandedChat(!expandedChat)}
                variant='ghost'
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
    </>
  )
}

