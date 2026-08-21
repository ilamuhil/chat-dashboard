'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type DashboardNotification = {
  id: string
  type: 'handover_request'
  conversationId: string
  createdAt: number
  read: boolean
}

type NotificationContextValue = {
  notifications: DashboardNotification[]
  unreadCount: number
  addNotification: (
    notification: Omit<DashboardNotification, 'read'>,
  ) => void
  markRead: (id: string) => void
  markConversationRead: (conversationId: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<DashboardNotification[]>(
    [],
  )

  const addNotification = useCallback(
    (notification: Omit<DashboardNotification, 'read'>) => {
      setNotifications(current => {
        if (current.some(item => item.id === notification.id)) return current

        return [
          { ...notification, read: false },
          ...current,
        ].slice(0, 50)
      })
    },
    [],
  )

  const markRead = useCallback((id: string) => {
    setNotifications(current =>
      current.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
  }, [])

  const markConversationRead = useCallback((conversationId: string) => {
    setNotifications(current =>
      current.map(notification =>
        notification.conversationId === conversationId
          ? { ...notification, read: true }
          : notification,
      ),
    )
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter(notification => !notification.read)
        .length,
      addNotification,
      markRead,
      markConversationRead,
    }),
    [notifications, addNotification, markRead, markConversationRead],
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
      'useDashboardNotifications must be used within NotificationProvider',
    )
  }
  return context
}
