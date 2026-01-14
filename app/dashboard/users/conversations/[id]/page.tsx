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
import { createClient } from '@/lib/supabase-client'
import { useParams } from 'next/navigation'

const getAgentJwt = async (conversation_id: string) => {
  const response = await fetch('/api/auth/agent/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversation_id,
      agent_takeover: false,
    }),
  })
  if (!response.ok) {
    console.error('Error minting agent jwt:', response.statusText)
    return null
  }
  const { token } = await response.json()
  return token as string
}

const getMessages = async (conversation_id: string, token: string) => {
  const messagesResponse = await fetch(
    `${process.env.NEXT_PUBLIC_PYTHON_SERVER_URL}/api/conversations/${conversation_id}/messages`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!messagesResponse.ok) {
    console.error('Error fetching messages:', messagesResponse.statusText)
    return null
  }
  const { messages } = await messagesResponse.json()
  return messages as unknown[]
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
      const supabase = createClient()
      const { data: conversation, error } = await supabase
        .from('conversations_meta')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error getting conversation:', error)
        return
      }

      if (!conversation) {
        console.error('Conversation not found')
        return
      }

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

