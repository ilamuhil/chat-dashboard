"use client"

import { useEffect } from "react"
import { toast, Toaster } from "sonner"
import { clientApiAxios } from "@/lib/axios-client"

export default function Boot() {
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
        console.log("SSE connection established...")

        eventStream.addEventListener("handover_request", event => {
          const data = JSON.parse(event.data) as {
            type: string
            conversation_id: string
          }
          toast.info(`Handover request received ${data.type}`)
        })

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
  }, [])

  return <Toaster richColors />
}
