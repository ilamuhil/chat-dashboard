'use client'

import React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ChatWindow from './ChatWindow'
import { Button } from '@/components/ui/button'
import {
  CheckIcon,
  ExpandIcon,
  LoaderCircleIcon,
  Minimize2Icon,
  MessageSquareIcon,
  UserRoundPlusIcon,
} from 'lucide-react'
import type { Message } from './types'
import { clientApiAxios } from '@/lib/axios-client'
import { toast } from 'sonner'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'
import { useChatSocket } from './useChatSocket'
import type { Message as ChatMessage } from './types'

type ChatInterfaceProps = {
  conversationId: string
  messages: Message[]
  initialMode: string
  initialHandOverStatus: string
}

export default function ChatInterface(props: ChatInterfaceProps) {
  const [expandedChat, setExpandedChat] = React.useState<boolean>(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [isJoined, setIsJoined] = React.useState(
    props.initialMode === 'human' ||
      props.initialHandOverStatus === 'accepted',
  )
  const [socketEnabled, setSocketEnabled] = React.useState(false)
  const [socketCredentials, setSocketCredentials] = React.useState<{
    token: string
    conversationId: string
  } | null>(null)
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>(
    props.messages,
  )
  const autoConnectPromiseRef = React.useRef<Promise<void> | null>(null)
  const { markConversationRead } = useDashboardNotifications()

  React.useEffect(() => {
    markConversationRead(props.conversationId)
  }, [markConversationRead, props.conversationId])

  const handleServerMessage = React.useCallback((data: unknown) => {
    if (typeof data !== 'object' || data === null) return

    const payload = data as Record<string, unknown>
    if (payload.type === 'error') {
      toast.error('Chat server error')
      return
    }

    const content =
      typeof payload.content === 'string'
        ? payload.content
        : typeof payload.message === 'string'
          ? payload.message
          : null
    if (!content) return

    const allowedRoles = ['user', 'support_agent', 'ai', 'system'] as const
    const role = allowedRoles.includes(payload.role as ChatMessage['role'])
      ? (payload.role as ChatMessage['role'])
      : payload.type === 'system'
        ? 'system'
        : 'user'
    const messageId =
      typeof payload.id === 'string'
        ? payload.id
        : `${props.conversationId}:${Date.now()}:${Math.random()}`

    setChatMessages(current => {
      if (current.some(message => message.id === messageId)) return current
      return [
        ...current,
        {
          id: messageId,
          conversation_id: props.conversationId,
          created_at:
            typeof payload.created_at === 'string'
              ? payload.created_at
              : new Date().toISOString(),
          agent_id:
            typeof payload.agent_id === 'string' ? payload.agent_id : '',
          content_type:
            typeof payload.content_type === 'string'
              ? payload.content_type
              : 'text',
          content,
          role,
        },
      ]
    })
  }, [props.conversationId])

  const handleSocketClosed = React.useCallback(() => {
    setSocketEnabled(false)
    setIsJoined(false)
    toast.error('The live conversation connection was closed')
  }, [])

  const { sendJsonMessage, readyState, disconnect } = useChatSocket({
    isOpen: socketEnabled,
    token: socketCredentials?.token ?? null,
    conversationId: socketCredentials?.conversationId ?? null,
    onServerMessage: handleServerMessage,
    onCloseCleanUp: handleSocketClosed,
  })

  React.useEffect(() => {
    return () => disconnect()
  }, [disconnect, props.conversationId])

  const requestAgentSocket = React.useCallback(
    async (agentTakeover: boolean, notify: boolean) => {
      setIsJoining(true)
      try {
        const { data } = await clientApiAxios.post<{
          token: string
          conversation_id: string
          agent_name?: string | null
        }>('/api/auth/agent/token', {
          conversation_id: props.conversationId,
          agent_takeover: agentTakeover,
        })

        if (agentTakeover) {
          const agentName = data.agent_name || 'A support agent'

          // Queue this before enabling the hook. It will be sent after the
          // authentication frame and before the first heartbeat ping.
          sendJsonMessage({
            type: 'agent_joined',
            conversation_id: props.conversationId,
            agent_name: agentName,
            message: `${agentName} has joined the conversation.`,
          })
        }

        setSocketCredentials({
          token: data.token,
          conversationId: props.conversationId,
        })
        setSocketEnabled(true)
        setIsJoined(true)
        if (notify) toast.success('You joined the conversation')
      } catch (error) {
        console.error('Failed to create support-agent socket token:', error)
        if (agentTakeover || notify) {
          toast.error(
            agentTakeover
              ? 'Could not join the conversation'
              : 'Could not reconnect to the conversation',
          )
        }
        setIsJoined(false)
      } finally {
        setIsJoining(false)
      }
    },
    [props.conversationId, sendJsonMessage],
  )

  React.useEffect(() => {
    const shouldAutoConnect =
      props.initialMode === 'human' ||
      props.initialHandOverStatus === 'accepted'
    if (
      !shouldAutoConnect ||
      socketEnabled ||
      autoConnectPromiseRef.current
    ) {
      return
    }

    const promise = requestAgentSocket(false, false)
    autoConnectPromiseRef.current = promise
  }, [
    props.initialHandOverStatus,
    props.initialMode,
    requestAgentSocket,
    socketEnabled,
  ])

  const joinConversation = async () => {
    if (isJoining || isJoined) return
    setIsJoining(true)
    try {
      await requestAgentSocket(true, true)
    } finally {
      setIsJoining(false)
    }
  }

  const sendMessage = (content: string) => {
    if (!socketEnabled) return

    sendJsonMessage({
      type: 'message',
      message: content,
    })
    setChatMessages(current => [
      ...current,
      {
        id: `local:${Date.now()}:${Math.random()}`,
        conversation_id: props.conversationId,
        created_at: new Date().toISOString(),
        agent_id: '',
        content_type: 'text',
        content,
        role: 'support_agent',
      },
    ])
  }

  const isSocketConnecting =
    isJoining ||
    (socketEnabled &&
      (readyState === 'connecting' || readyState === 'closing'))
  
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
          <div className='flex items-center gap-1.5'>
            {!isJoined && (
              <Button
                type='button'
                size='sm'
                onClick={joinConversation}
                disabled={isSocketConnecting}
                className='h-8 rounded-lg bg-sky-700 px-2.5 text-xs hover:bg-sky-800'>
                {isSocketConnecting ? (
                  <LoaderCircleIcon className='mr-1.5 size-3.5 animate-spin' />
                ) : (
                  <UserRoundPlusIcon className='mr-1.5 size-3.5' />
                )}
                Join conversation
              </Button>
            )}
            {isJoined && readyState !== 'open' && (
              <span className='text-[11px] text-muted-foreground'>
                Connecting…
              </span>
            )}
            {isJoined && (
              <span className='inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-700'>
                <CheckIcon className='size-3.5' />
                Joined
              </span>
            )}
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
          </div>
        </header>
        <div className='min-h-0 flex-1'>
          <ChatWindow
            messages={chatMessages}
            onSendMessage={sendMessage}
            disabled={!isJoined || !socketEnabled}
          />
        </div>
      </section>
    </>
  )
}
