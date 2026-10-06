'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { isAxiosError } from 'axios'
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
import { dashboardButtonClass } from '@/lib/dashboard-buttons'
import { cn } from '@/lib/utils'
import { clientApiAxios } from '@/lib/axios-client'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

import ChatWindow from './ChatWindow'
import { useChatSocket } from './useChatSocket'
import type { Message as ChatMessage } from './types'

type ChatFrame = {
  top: number
  left: number
  width: number
  height: number
}

const expandTransition =
  'top 320ms cubic-bezier(0.22, 1, 0.36, 1), left 320ms cubic-bezier(0.22, 1, 0.36, 1), width 320ms cubic-bezier(0.22, 1, 0.36, 1), height 320ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 320ms cubic-bezier(0.22, 1, 0.36, 1)'

function fullscreenFrame(): ChatFrame {
  return {
    top: 0,
    left: 0,
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }
}

function frameFromRect(rect: DOMRect): ChatFrame {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}
import {
  conversationEndedTypes,
  conversationStatusEvent,
  isConversationEndedMessage,
  type ConversationStatusDetail,
} from '../conversation-status'

/** Keep the visitor dots up briefly after typing stops so they don't flicker. */
const VISITOR_TYPING_HIDE_BUFFER_MS = 1_400

type ChatInterfaceProps = {
  conversationId: string
  messages: ChatMessage[]
  initialMode: string
  initialHandOverStatus: string
  initialStatus: string
  initialClosedBy?: string | null
  initialLoadError?: string | null
}

export default function ChatInterface({
  conversationId,
  messages,
  initialMode,
  initialHandOverStatus,
  initialStatus,
  initialClosedBy = null,
  initialLoadError = null,
}: ChatInterfaceProps) {
  const slotRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const [presentation, setPresentation] = React.useState<{
    frame: ChatFrame
    animate: boolean
    mode: 'expand' | 'collapse'
  } | null>(null)
  const expandedChat = presentation !== null
  const [isJoining, setIsJoining] = React.useState(false)
  const [socketError, setSocketError] = React.useState<string | null>(
    initialLoadError,
  )
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
  const [isVisitorTyping, setIsVisitorTyping] = React.useState(false)
  const visitorTypingHideRef = React.useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)

  const clearVisitorTyping = React.useCallback(() => {
    if (visitorTypingHideRef.current) {
      clearTimeout(visitorTypingHideRef.current)
      visitorTypingHideRef.current = undefined
    }
    setIsVisitorTyping(false)
  }, [])

  const showVisitorTyping = React.useCallback(() => {
    if (visitorTypingHideRef.current) {
      clearTimeout(visitorTypingHideRef.current)
      visitorTypingHideRef.current = undefined
    }
    setIsVisitorTyping(true)
  }, [])

  const releaseVisitorTyping = React.useCallback(() => {
    if (visitorTypingHideRef.current) {
      clearTimeout(visitorTypingHideRef.current)
    }
    visitorTypingHideRef.current = setTimeout(() => {
      visitorTypingHideRef.current = undefined
      setIsVisitorTyping(false)
    }, VISITOR_TYPING_HIDE_BUFFER_MS)
  }, [])

  React.useEffect(() => {
    return () => {
      if (visitorTypingHideRef.current) {
        clearTimeout(visitorTypingHideRef.current)
      }
    }
  }, [])

  const [messageState, setMessageState] = React.useState<{
    conversationId: string
    messages: ChatMessage[]
  }>({
    conversationId,
    messages,
  })
  const [closedByState, setClosedByState] = React.useState<{
    conversationId: string
    status: string
    closedBy: string | null
  }>({
    conversationId,
    status: initialStatus,
    closedBy: initialClosedBy,
  })
  const conversationStatus =
    closedByState.conversationId === conversationId
      ? closedByState.status
      : initialStatus
  const closedBy =
    closedByState.conversationId === conversationId
      ? closedByState.closedBy
      : initialClosedBy

  React.useEffect(() => {
    const onStatusChange = (event: Event) => {
      const detail = (event as CustomEvent<ConversationStatusDetail>).detail
      if (!detail?.ids?.includes(conversationId) || !detail.status) return
      setClosedByState({
        conversationId,
        status: detail.status,
        closedBy: detail.status === 'closed' ? detail.closedBy : null,
      })
    }

    window.addEventListener(conversationStatusEvent, onStatusChange)
    return () => {
      window.removeEventListener(conversationStatusEvent, onStatusChange)
    }
  }, [conversationId])

  const chatMessages =
    messageState.conversationId === conversationId
      ? messageState.messages
      : messages
  const visibleMessages = React.useMemo(() => {
    if (
      conversationStatus !== 'closed' ||
      chatMessages.some(isConversationEndedMessage)
    ) {
      return chatMessages
    }

    return [
      ...chatMessages,
      {
        id: `${conversationId}:ended`,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
        agent_id: '',
        content_type: 'end_chat',
        content: 'Chat ended',
        role: 'system' as const,
        closed_by: closedBy,
      },
    ]
  }, [chatMessages, closedBy, conversationId, conversationStatus])
  const conversationEnded =
    conversationStatus === 'closed' ||
    visibleMessages.some(isConversationEndedMessage)

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

      if (
        payload.type === 'typing' &&
        typeof payload.is_typing === 'boolean'
      ) {
        if (payload.actor === 'support_agent') return
        if (payload.is_typing) showVisitorTyping()
        else releaseVisitorTyping()
        return
      }

      const content =
        typeof payload.content === 'string'
          ? payload.content
          : typeof payload.message === 'string'
            ? payload.message
            : null

      if (!content) return

      const payloadClosedBy =
        typeof payload.closed_by === 'string' ? payload.closed_by : null
      if (payloadClosedBy) {
        setClosedByState(current => ({
          conversationId,
          status:
            current.conversationId === conversationId
              ? 'closed'
              : initialStatus,
          closedBy: payloadClosedBy,
        }))
      }

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

      if (role === 'user') clearVisitorTyping()

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

        const incomingType =
          typeof payload.type === 'string' ? payload.type : ''
        const incomingIsEnded =
          conversationEndedTypes.includes(incomingType) ||
          conversationEndedTypes.includes(
            typeof payload.content_type === 'string'
              ? payload.content_type
              : '',
          )
        if (
          incomingIsEnded &&
          currentMessages.some(isConversationEndedMessage)
        ) {
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
              closed_by: payloadClosedBy,
            },
          ],
        }
      })
    },
    [
      clearVisitorTyping,
      conversationId,
      initialStatus,
      messages,
      releaseVisitorTyping,
      showVisitorTyping,
    ],
  )

  const handleSocketClosed = React.useCallback((reason?: string) => {
    setSocketEnabled(false)
    setSocketCredentials(null)
    setIsJoined(false)
    setSocketError(
      reason || 'The chat connection could not be established.',
    )

    toast.error(
      reason || 'The live conversation connection was closed',
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
        setSocketError(null)
        const { data } =
          await clientApiAxios.post<{
            token: string
            conversation_id: string
            agent_name?: string | null
          }>('/api/auth/agent/token', {
            conversation_id: conversationId,
            agent_takeover: agentTakeover,
          }, {
            timeout: 10_000,
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
          const serverError = isAxiosError(error)
            ? error.response?.data as {
              error?: unknown
              detail?: unknown
              message?: unknown
            } | undefined
            : undefined
          const errorMessage =
            typeof serverError?.error === 'string'
              ? serverError.error
              : typeof serverError?.detail === 'string'
                ? serverError.detail
                : typeof serverError?.message === 'string'
                  ? serverError.message
                  : isAxiosError(error) &&
                    (error.code === 'ECONNABORTED' ||
                      error.code === 'ETIMEDOUT')
                    ? 'The join request timed out. Please try again.'
                    : 'Could not join the conversation'

          toast.error(
            agentTakeover ? errorMessage : 'Could not reconnect to the conversation',
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

  const reportTyping = React.useCallback(
    (active: boolean) => {
      if (readyState !== 'open') return false
      sendJsonMessage({ type: 'typing', is_typing: active })
      return true
    },
    [readyState, sendJsonMessage],
  )

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

    appendLocalMessage(trimmedContent, 'text')
  }

  const appendLocalMessage = (content: string, contentType: string) => {
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
            content_type: contentType,
            content,
            role: 'support_agent',
          },
        ],
      }
    })
  }

  const sendFile = (fileName: string) => {
    if (!socketEnabled || readyState !== 'open' || !fileName) return
    sendJsonMessage({
      type: 'file',
      message: fileName,
      content: fileName,
    })
    appendLocalMessage(fileName, 'file')
  }

  React.useLayoutEffect(() => {
    if (!presentation || presentation.animate || presentation.mode !== 'expand') {
      return
    }

    const frameId = requestAnimationFrame(() => {
      setPresentation({
        frame: fullscreenFrame(),
        animate: true,
        mode: 'expand',
      })
    })

    return () => cancelAnimationFrame(frameId)
  }, [presentation])

  React.useEffect(() => {
    if (presentation?.mode !== 'expand' || !presentation.animate) return

    const fit = () => {
      setPresentation(current =>
        current?.mode === 'expand' && current.animate
          ? { ...current, frame: fullscreenFrame() }
          : current,
      )
    }

    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [presentation?.animate, presentation?.mode])

  const toggleExpandedChat = () => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!presentation) {
      const rect = panelRef.current?.getBoundingClientRect()
      if (!rect) return
      if (reduceMotion) {
        setPresentation({
          frame: fullscreenFrame(),
          animate: false,
          mode: 'expand',
        })
        return
      }
      setPresentation({
        frame: frameFromRect(rect),
        animate: false,
        mode: 'expand',
      })
      return
    }

    const rect = slotRef.current?.getBoundingClientRect()
    if (!rect || reduceMotion) {
      setPresentation(null)
      return
    }

    setPresentation({
      frame: frameFromRect(rect),
      animate: true,
      mode: 'collapse',
    })
  }

  const isSocketConnecting =
    isJoining ||
    (socketEnabled &&
      (readyState === 'connecting' ||
        readyState === 'closing'))

  const chatPanel = (
      <section
        ref={panelRef}
        onTransitionEnd={event => {
          if (
            event.target !== panelRef.current ||
            event.propertyName !== 'width' ||
            presentation?.mode !== 'collapse'
          ) {
            return
          }
          setPresentation(null)
        }}
        className={cn(
          'dashboard-surface flex min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-950',
          presentation
            ? 'fixed z-50 m-0 box-border'
            : 'relative h-full rounded-xl',
          presentation?.mode === 'expand' &&
            presentation.animate &&
            'shadow-2xl',
        )}
        style={
          presentation
            ? {
                top: presentation.frame.top,
                left: presentation.frame.left,
                width: presentation.frame.width,
                height: presentation.frame.height,
                borderRadius:
                  presentation.mode === 'expand' && presentation.animate
                    ? 0
                    : 12,
                transition: presentation.animate ? expandTransition : 'none',
              }
            : undefined
        }>
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
                className={cn(
                  dashboardButtonClass,
                  'h-8 rounded-lg px-2.5 text-xs',
                )}>
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
                  onClick={toggleExpandedChat}
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
            messages={visibleMessages}
            closedBy={closedBy}
            onSendMessage={sendMessage}
            onSendFile={sendFile}
            uploadToken={socketCredentials?.token ?? null}
            onTypingActivity={reportTyping}
            isVisitorTyping={isVisitorTyping}
            connectionError={socketError}
            disabled={
              !isJoined ||
              !socketEnabled ||
              readyState !== 'open'
            }
          />
        </div>
      </section>
  )

  return (
    <div ref={slotRef} className='h-full min-h-0 min-w-0'>
      {presentation && typeof document !== 'undefined'
        ? createPortal(chatPanel, document.body)
        : chatPanel}
    </div>
  )
}