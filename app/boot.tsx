"use client"

import { useEffect } from "react"
import { toast, Toaster } from "sonner"
import { clientApiAxios } from "@/lib/axios-client"
import { useDashboardNotifications } from "@/app/dashboard/notifications/NotificationProvider"

export default function Boot() {
  const { addNotification } = useDashboardNotifications()

  useEffect(() => {
    let eventStream: EventSource | null = null
    let cancelled = false

    const connect = async () => {
      try {
        console.log("Establishing SSE connection...")
        const {
          data: { token },
        } = await clientApiAxios.get<{ token: string }>("/api/auth/sse")

        const serverUrl = process.env.NEXT_PUBLIC_PYTHON_SERVER_URL
        if (!serverUrl) {
          throw new Error("NEXT_PUBLIC_PYTHON_SERVER_URL is not configured")
        }

        if (cancelled) return

        eventStream = new EventSource(
          `${serverUrl}/api/notifications/events?token=${encodeURIComponent(token)}`,
        )
        eventStream.onopen = () => {
          console.log("SSE connection opened")
        }

        const handleHandoverRequest = (event: MessageEvent<string>) => {
          const data = JSON.parse(event.data) as {
            id?: string
            request_id?: string
            type?: string
            conversation_id?: string
          }
          const conversationId = data.conversation_id

          if (!conversationId) {
            console.error("Ignoring handover event without conversation_id")
            return
          }

          addNotification({
            id:
              event.lastEventId ||
              data.id ||
              data.request_id ||
              `handover_request:${conversationId}`,
            type: "handover_request",
            conversationId,
            createdAt: Date.now(),
          })
          toast.info("Agent request received")
        }

        eventStream.addEventListener("handover_request", handleHandoverRequest)
        eventStream.addEventListener("agent_request", handleHandoverRequest)

        eventStream.onerror = error => {
          console.error("SSE connection error:", error)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error establishing SSE connection", error)
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      eventStream?.close()
    }
  }, [addNotification])

  return <Toaster richColors />
}
