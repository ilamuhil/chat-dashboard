'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { clientApiAxios } from '@/lib/axios-client'

export type DashboardNotification = {
  id: string
  title: string
  body: string
  type: string
  createdAt: string
  readAt: string | null
  metadata: Record<string, unknown>
}

type NotificationContextValue = {
  notifications: DashboardNotification[]
  unreadCount: number
  addNotification: (
    notification: DashboardNotification,
  ) => void
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  markConversationRead: (
    conversationId: string,
  ) => Promise<void>
}

const NotificationContext =
  createContext<NotificationContextValue | null>(null)

function sortNotifications(
  notifications: DashboardNotification[],
) {
  return notifications.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  )
}

export function NotificationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [notifications, setNotifications] = useState<
    DashboardNotification[]
  >([])

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await clientApiAxios.get<
          DashboardNotification[]
        >('/api/notifications')

        setNotifications(current => {
          const byId = new Map(
            current.map(notification => [
              notification.id,
              notification,
            ]),
          )

          for (const notification of data ?? []) {
            // Database response is authoritative.
            byId.set(notification.id, notification)
          }

          return sortNotifications(
            Array.from(byId.values()),
          ).slice(0, 50)
        })
      } catch (error) {
        console.error(
          'Failed to fetch notifications',
          error,
        )
      }
    }

    void fetchNotifications()
  }, [])

  const addNotification = useCallback(
    (notification: DashboardNotification) => {
      setNotifications(current => {
        const existing = current.find(
          item => item.id === notification.id,
        )

        if (existing) {
          return current.map(item =>
            item.id === notification.id
              ? {
                  ...notification,
                  // Do not turn a read notification unread after
                  // an SSE reconnection.
                  readAt:
                    existing.readAt ??
                    notification.readAt,
                }
              : item,
          )
        }

        return [notification, ...current].slice(0, 50)
      })
    },
    [],
  )

  const markRead = useCallback(async (id: string) => {
    if (!id) return

    try {
      const { data } =
        await clientApiAxios.patch<DashboardNotification>(
          `/api/notifications/${id}/read`,
        )

      setNotifications(current =>
        current.map(notification =>
          notification.id === data.id
            ? data
            : notification,
        ),
      )
    } catch (error) {
      console.error(
        'Failed to mark notification as read',
        error,
      )
    }
  }, [])

  const markAllRead = useCallback(async () => {
    try {
      const { data } =
        await clientApiAxios.patch<
          DashboardNotification[]
        >('/api/notifications/read-all')

      const updatedById = new Map(
        data.map(notification => [
          notification.id,
          notification,
        ]),
      )

      setNotifications(current =>
        current.map(notification =>
          updatedById.get(notification.id) ??
          notification,
        ),
      )
    } catch (error) {
      console.error(
        'Failed to mark notifications as read',
        error,
      )
    }
  }, [])

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      const matching = notifications.filter(
        notification =>
          notification.metadata.conversationId
            === conversationId &&
          !notification.readAt,
      )

      await Promise.all(
        matching.map(notification =>
          markRead(notification.id),
        ),
      )
    },
    [notifications, markRead],
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter(
        notification => !notification.readAt,
      ).length,
      addNotification,
      markRead,
      markAllRead,
      markConversationRead,
    }),
    [
      notifications,
      addNotification,
      markRead,
      markAllRead,
      markConversationRead,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useDashboardNotifications() {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error(
      'This component is not inside NotificationProvider',
    )
  }

  return context
}