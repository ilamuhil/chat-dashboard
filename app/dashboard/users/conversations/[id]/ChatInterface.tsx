'use client'

import React from 'react'
import {
  CheckIcon,
  ExpandIcon,
  LoaderCircleIcon,
  Minimize2Icon,
  MessageSquareIcon,
  UserRoundPlusIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { clientApiAxios } from '@/lib/axios-client'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

import ChatWindow from './ChatWindow'
import { useChatSocket } from './useChatSocket'
import type { Message as ChatMessage } from './types'

type ChatInterfaceProps = {
  conversationId: string
  messages: ChatMessage[]
  initialMode: string
  initialHandOverStatus: string
  initialStatus: string
}

const conversationEndedTypes = [
  'end_chat',
  'chat_ended',
  'chat_closed',
  'conversation_end',
  'conversation_ended',
  'conversation_closed',
]

function isConversationEndedMessage(message: ChatMessage) {
  if (conversationEndedTypes.includes(message.content_type)) {
    return true
  }

  return (
    message.role === 'system' &&
    /\b(?:chat|conversation)\b.*\b(?:ended|closed)\b|\b(?:ended|closed)\b.*\b(?:chat|conversation)\b|\b(?:ended|closed)\b.*\b(?:user|visitor)\b/i.test(
      message.content,
    )
  )
}

export default function ChatInterface({
  conversationId,
  messages,
  initialMode,
  initialHandOverStatus,
  initialStatus,
}: ChatInterfaceProps) {
  const [expandedChat, setExpandedChat] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const initiallyClosed = initialStatus !== 'open'

  const [isJoined, setIsJoined] = React.useState(
    !initiallyClosed &&
      (initialMode === 'human' ||
        initialHandOverStatus === 'accepted'),
  )

  const [socketEnabled, setSocketEnabled] =
    React.useState(false)

  const [socketCredentials, setSocketCredentials] =
    React.useState<{
      token: string
      conversationId: string
    } | null>(null)

  const [messageState, setMessageState] = React.useState<{
    conversationId: string
    messages: ChatMessage[]
  }>({
    conversationId,
    messages,
  })

  const chatMessages =
    messageState.conversationId === conversationId
      ? messageState.messages
      : messages
  const conversationEnded =
    initiallyClosed ||
    chatMessages.some(isConversationEndedMessage)

  const autoConnectPromiseRef =
    React.useRef<Promise<void> | null>(null)

  const { markConversationRead } =
    useDashboardNotifications()

  /*
   * Opening the conversation counts as viewing its handover
   * notifications. The provider updates the persisted readAt value.
   */
  React.useEffect(() => {
    void markConversationRead(conversationId)
  }, [conversationId, markConversationRead])

  const handleServerMessage = React.useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || data === null) {
        return
      }

      const payload = data as Record<string, unknown>

      if (payload.type === 'error') {
        toast.error(
          typeof payload.message === 'string'
            ? payload.message
            : 'Chat server error',
        )
        return
      }

      const content =
        typeof payload.content === 'string'
          ? payload.content
          : typeof payload.message === 'string'
            ? payload.message
            : null

      if (!content) return

      const allowedRoles: ChatMessage['role'][] = [
        'user',
        'support_agent',
        'ai',
        'system',
      ]

      const role = allowedRoles.includes(
        payload.role as ChatMessage['role'],
      )
        ? (payload.role as ChatMessage['role'])
        : payload.type === 'system' ||
            conversationEndedTypes.includes(
              typeof payload.type === 'string' ? payload.type : '',
            )
          ? 'system'
          : 'user'

      const messageId =
        typeof payload.id === 'string'
          ? payload.id
          : `${conversationId}:${Date.now()}:${Math.random()}`

      setMessageState(current => {
        const currentMessages =
          current.conversationId === conversationId
            ? current.messages
            : messages

        if (currentMessages.some(message => message.id === messageId)) {
          return current
        }

        return {
          conversationId,
          messages: [
            ...currentMessages,
            {
              id: messageId,
              conversation_id: conversationId,
              created_at:
                typeof payload.created_at === 'string'
                  ? payload.created_at
                  : new Date().toISOString(),
              agent_id:
                typeof payload.agent_id === 'string'
                  ? payload.agent_id
                  : '',
              content_type:
                typeof payload.content_type === 'string'
                  ? payload.content_type
                  : conversationEndedTypes.includes(
                        typeof payload.type === 'string'
                          ? payload.type
                          : '',
                      )
                    ? payload.type as string
                    : 'text',
              content,
              role,
            },
          ],
        }
      })
    },
    [conversationId, messages],
  )

  const handleSocketClosed = React.useCallback(() => {
    setSocketEnabled(false)
    setSocketCredentials(null)
    setIsJoined(false)

    toast.error(
      'The live conversation connection was closed',
    )
  }, [])

  const {
    sendJsonMessage,
    readyState,
    disconnect,
  } = useChatSocket({
    isOpen: socketEnabled,
    token: socketCredentials?.token ?? null,
    conversationId:
      socketCredentials?.conversationId ?? null,
    onServerMessage: handleServerMessage,
    onCloseCleanUp: handleSocketClosed,
  })

  React.useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect, conversationId])

  const requestAgentSocket = React.useCallback(
    async (
      agentTakeover: boolean,
      notify: boolean,
    ) => {
      if (isJoining) return

      setIsJoining(true)

      try {
        const { data } =
          await clientApiAxios.post<{
            token: string
            conversation_id: string
            agent_name?: string | null
          }>('/api/auth/agent/token', {
            conversation_id: conversationId,
            agent_takeover: agentTakeover,
          })

        if (
          data.conversation_id !== conversationId
        ) {
          throw new Error(
            'Agent token conversation mismatch',
          )
        }

        if (agentTakeover) {
          const agentName =
            data.agent_name || 'A support agent'

          /*
           * useChatSocket queues this message until the socket
           * authenticates and opens.
           */
          sendJsonMessage({
            type: 'agent_joined',
            conversation_id: conversationId,
            agent_name: agentName,
            message: `${agentName} has joined the conversation.`,
          })
        }

        setSocketCredentials({
          token: data.token,
          conversationId: data.conversation_id,
        })

        setSocketEnabled(true)
        setIsJoined(true)

        /*
         * Ensure the associated handover notification is persisted
         * as read when the agent joins.
         */
        await markConversationRead(conversationId)

        if (notify) {
          toast.success(
            'You joined the conversation',
          )
        }
      } catch (error) {
        console.error(
          'Failed to create support-agent socket token:',
          error,
        )

        setSocketEnabled(false)
        setSocketCredentials(null)
        setIsJoined(false)

        if (agentTakeover || notify) {
          toast.error(
            agentTakeover
              ? 'Could not join the conversation'
              : 'Could not reconnect to the conversation',
          )
        }
      } finally {
        setIsJoining(false)
      }
    },
    [
      conversationId,
      isJoining,
      markConversationRead,
      sendJsonMessage,
    ],
  )

  /*
   * Reconnect when this conversation was already taken over by
   * an agent before the page loaded.
   */
  React.useEffect(() => {
    const shouldAutoConnect =
      !initiallyClosed &&
      (initialMode === 'human' ||
        initialHandOverStatus === 'accepted')

    if (
      !shouldAutoConnect ||
      socketEnabled ||
      isJoining ||
      autoConnectPromiseRef.current
    ) {
      return
    }

    const promise = requestAgentSocket(
      false,
      false,
    )

    autoConnectPromiseRef.current = promise

    void promise.finally(() => {
      if (
        autoConnectPromiseRef.current === promise
      ) {
        autoConnectPromiseRef.current = null
      }
    })
  }, [
    initiallyClosed,
    initialHandOverStatus,
    initialMode,
    isJoining,
    requestAgentSocket,
    socketEnabled,
  ])

  const joinConversation = async () => {
    if (isJoining || isJoined) return

    await requestAgentSocket(true, true)
  }

  const sendMessage = (content: string) => {
    const trimmedContent = content.trim()
    const contentWithoutBreakTags = trimmedContent
      .replace(/<br\s*\/?>/gi, '')
      .trim()

    if (
      !contentWithoutBreakTags ||
      !socketEnabled ||
      readyState !== 'open'
    ) {
      return
    }

    sendJsonMessage({
      type: 'message',
      message: trimmedContent,
    })

    setMessageState(current => {
      const currentMessages =
        current.conversationId === conversationId
          ? current.messages
          : messages

      return {
        conversationId,
        messages: [
          ...currentMessages,
          {
            id: `local:${Date.now()}:${Math.random()}`,
            conversation_id: conversationId,
            created_at: new Date().toISOString(),
            agent_id: '',
            content_type: 'text',
            content: trimmedContent,
            role: 'support_agent',
          },
        ],
      }
    })
  }

  const isSocketConnecting =
    isJoining ||
    (socketEnabled &&
      (readyState === 'connecting' ||
        readyState === 'closing'))

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
            : 'relative',
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
            {!isJoined && !conversationEnded && (
              <Button
                type='button'
                size='sm'
                onClick={() => void joinConversation()}
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

            {conversationEnded ? (
              <span className='inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-600'>
                Chat closed
              </span>
            ) : isJoined &&
              readyState !== 'open' && (
                <span className='text-[11px] text-muted-foreground'>
                  Connecting…
                </span>
              )}

            {!conversationEnded &&
              isJoined &&
              readyState === 'open' && (
                <span className='inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-700'>
                  <CheckIcon className='size-3.5' />
                  Joined
                </span>
              )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  aria-label={
                    expandedChat
                      ? 'Collapse chat'
                      : 'Expand chat'
                  }
                  onClick={() =>
                    setExpandedChat(current => !current)
                  }
                  variant='ghost'
                  size='icon'
                  className='size-8 rounded-lg bg-slate-50 hover:bg-slate-100'>
                  {expandedChat ? (
                    <Minimize2Icon className='size-4' />
                  ) : (
                    <ExpandIcon className='size-4' />
                  )}
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                <p>
                  {expandedChat
                    ? 'Collapse chat'
                    : 'Expand chat'}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div className='min-h-0 flex-1'>
          <ChatWindow
            messages={chatMessages}
            onSendMessage={sendMessage}
            disabled={
              !isJoined ||
              !socketEnabled ||
              readyState !== 'open'
            }
          />
        </div>
      </section>
    </>
  )
}