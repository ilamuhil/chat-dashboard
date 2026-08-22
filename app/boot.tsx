'use client'

import { useEffect, useRef } from 'react'
import { toast, Toaster } from 'sonner'

import { clientApiAxios } from '@/lib/axios-client'
import {
  useDashboardNotifications,
  type DashboardNotification,
} from '@/app/dashboard/notifications/NotificationProvider'

export default function Boot() {
  const { addNotification } =
    useDashboardNotifications()

  const displayedNotificationIds =
    useRef<Set<string>>(new Set())

  useEffect(() => {
    let eventStream: EventSource | null = null
    let cancelled = false

    const connect = async () => {
      try {
        const {
          data: { token },
        } = await clientApiAxios.get<{
          token: string
        }>('/api/auth/sse')

        const serverUrl =
          process.env.NEXT_PUBLIC_PYTHON_SERVER_URL

        if (!serverUrl) {
          throw new Error(
            'NEXT_PUBLIC_PYTHON_SERVER_URL is not configured',
          )
        }

        if (cancelled) return

        eventStream = new EventSource(
          `${serverUrl}/api/notifications/events?token=${encodeURIComponent(token)}`,
        )

        eventStream.onopen = () => {
          console.log('SSE connection opened')
        }

        const handleNotification = (
          event: MessageEvent<string>,
        ) => {
          try {
            const notification = JSON.parse(
              event.data,
            ) as DashboardNotification

            if (
              !notification.id ||
              !notification.type
            ) {
              console.warn(
                'Ignoring invalid notification payload',
              )
              return
            }

            addNotification(notification)

            if (
              displayedNotificationIds.current.has(
                notification.id,
              )
            ) {
              return
            }

            displayedNotificationIds.current.add(
              notification.id,
            )

            toast.info(
              notification.title ||
              'New notification',
            )
          } catch (error) {
            console.error(
              'Failed to parse SSE notification',
              error,
            )
          }
        }

        eventStream.addEventListener(
          'notification',
          handleNotification,
        )

        eventStream.onerror = error => {
          console.error(
            'SSE connection error:',
            error,
          )
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Error establishing SSE connection',
            error,
          )
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      eventStream?.close()
      eventStream = null
    }
  }, [addNotification])

  return <Toaster richColors />
}