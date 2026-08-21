'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export type SocketReadyState = 'connecting' | 'open' | 'closing' | 'closed'

type UseChatSocketParams = {
  isOpen: boolean
  token: string | null
  conversationId: string | null
  onServerMessage?: (data: unknown) => void
  onCloseCleanUp?: () => void
}

function toWebSocketUrl(httpOrWsUrl: string) {
  if (httpOrWsUrl.startsWith('https://')) {
    return `wss://${httpOrWsUrl.slice('https://'.length)}`
  }
  if (httpOrWsUrl.startsWith('http://')) {
    return `ws://${httpOrWsUrl.slice('http://'.length)}`
  }
  return httpOrWsUrl
}

export function useChatSocket({
  isOpen,
  token,
  conversationId,
  onServerMessage,
  onCloseCleanUp,
}: UseChatSocketParams) {
  const socketRef = useRef<WebSocket | null>(null)
  const pendingMessagesRef = useRef<Array<Record<string, unknown>>>([])
  const onServerMessageRef = useRef(onServerMessage)
  const onCloseRef = useRef(onCloseCleanUp)
  const tokenRef = useRef(token)
  const conversationIdRef = useRef(conversationId)
  const heartbeatIntervalRef = useRef<
    ReturnType<typeof setInterval> | undefined
  >(undefined)
  const watchDogTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const awaitingPongRef = useRef(false)
  const manualCloseRef = useRef(false)

  const [readyState, setReadyState] = useState<SocketReadyState>('closed')

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = undefined
    }
    if (watchDogTimerRef.current) {
      clearTimeout(watchDogTimerRef.current)
      watchDogTimerRef.current = undefined
    }
    awaitingPongRef.current = false
  }, [])

  useEffect(() => {
    onServerMessageRef.current = onServerMessage
  }, [onServerMessage])

  useEffect(() => {
    onCloseRef.current = onCloseCleanUp
  }, [onCloseCleanUp])

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  const wsUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL?.trim()
    if (!base) return ''
    return `${toWebSocketUrl(base)}/api/chat/ws`
  }, [])

  const socketUrl = useMemo(
    () => (isOpen && token && conversationId && wsUrl ? wsUrl : null),
    [conversationId, isOpen, token, wsUrl],
  )

  const sendJsonMessage = useCallback((payload: Record<string, unknown>) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pendingMessagesRef.current.push(payload)
      return
    }
    socket.send(JSON.stringify(payload))
  }, [])

  useEffect(() => {
    let cancelled = false
    let attempt = 0

    const connect = () => {
      if (cancelled || !socketUrl) return

      manualCloseRef.current = false
      const socket = new WebSocket(socketUrl)
      socketRef.current = socket
      setReadyState('connecting')

      socket.onopen = () => {
        if (cancelled || socketRef.current !== socket) return

        clearHeartbeat()
        attempt = 0
        setReadyState('open')

        const activeToken = tokenRef.current
        const activeConversationId = conversationIdRef.current
        if (!activeToken || !activeConversationId) return

        // FastAPI requires authentication as the first WebSocket frame.
        socket.send(
          JSON.stringify({
            token: activeToken,
            conversation_id: activeConversationId,
          }),
        )

        for (const payload of pendingMessagesRef.current) {
          socket.send(JSON.stringify(payload))
        }
        pendingMessagesRef.current = []

        const sendPing = () => {
          if (
            cancelled ||
            socketRef.current !== socket ||
            socket.readyState !== WebSocket.OPEN ||
            awaitingPongRef.current
          ) {
            return
          }

          socket.send(JSON.stringify({ type: 'ping' }))
          awaitingPongRef.current = true
          if (watchDogTimerRef.current) {
            clearTimeout(watchDogTimerRef.current)
          }
          watchDogTimerRef.current = setTimeout(() => {
            if (awaitingPongRef.current) {
              socket.close(4000, 'Ping timeout')
            }
          }, 5000)
        }

        sendPing()
        heartbeatIntervalRef.current = setInterval(sendPing, 20_000)
      }

      socket.onmessage = (event: MessageEvent) => {
        if (cancelled || socketRef.current !== socket) return

        const raw = event.data
        if (typeof raw !== 'string') {
          onServerMessageRef.current?.(raw)
          return
        }

        try {
          const parsed = JSON.parse(raw) as { type?: unknown }
          if (parsed.type === 'pong') {
            awaitingPongRef.current = false
            if (watchDogTimerRef.current) {
              clearTimeout(watchDogTimerRef.current)
              watchDogTimerRef.current = undefined
            }
            return
          }
          onServerMessageRef.current?.(parsed)
        } catch {
          onServerMessageRef.current?.(raw)
        }
      }

      socket.onerror = error => {
        if (!cancelled && socketRef.current === socket) {
          console.error('Chat WebSocket error:', error)
        }
      }

      socket.onclose = () => {
        clearHeartbeat()
        if (cancelled) return

        if (socketRef.current === socket) {
          socketRef.current = null
        }

        if (!manualCloseRef.current && attempt < 5) {
          const delay = Math.min(30_000, 2_000 * 2 ** attempt)
          attempt += 1
          setReadyState('connecting')
          retryTimerRef.current = setTimeout(connect, delay)
          return
        }

        setReadyState('closed')
        onCloseRef.current?.()
      }
    }

    connect()

    return () => {
      cancelled = true
      clearHeartbeat()
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = undefined
      }

      const socket = socketRef.current
      socketRef.current = null
      if (
        socket &&
        (socket.readyState === WebSocket.CONNECTING ||
          socket.readyState === WebSocket.OPEN)
      ) {
        manualCloseRef.current = true
        setReadyState('closing')
        socket.close(1000, 'Normal Closure')
      }
    }
  }, [clearHeartbeat, socketUrl])

  const disconnect = useCallback(() => {
    clearHeartbeat()
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = undefined
    }

    manualCloseRef.current = true
    const socket = socketRef.current
    if (!socket) {
      setReadyState('closed')
      return
    }

    setReadyState('closing')
    socket.close(1000, 'Normal Closure')
  }, [clearHeartbeat])

  return { sendJsonMessage, readyState, disconnect }
}
