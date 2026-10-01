'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Trash2, UserRoundPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

function getNotificationRoute(
  type: string,
  metadata: Record<string, unknown>,
) {
  if (
    type === 'handover_request' &&
    typeof metadata.conversationId === 'string'
  ) {
    return `/dashboard/users/conversations/${metadata.conversationId}`
  }

  if (type === 'lead_captured') return '/dashboard/users/leads'
  return null
}

function NotificationTypeIcon({ type }: { type: string }) {
  return type === 'lead_captured' ? (
    <UserRoundPlus className='size-3' aria-hidden='true' />
  ) : (
    <Bell className='size-3' aria-hidden='true' />
  )
}

export default function DashboardNotificationsPage() {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    clearAll,
  } = useDashboardNotifications()
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await clearAll()
      setClearOpen(false)
    } finally {
      setClearing(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteNotification(id)
    } catch {
      // The provider restores the item if the request fails.
    } finally {
      setDeletingId(current => (current === id ? null : current))
    }
  }

  return (
    <div className='mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col'>
      <div className='flex shrink-0 items-center justify-between gap-3'>
        <div>
          <h1 className='text-sm font-medium text-slate-900'>
            Notifications
          </h1>
          <p className='mt-0.5 text-xs text-slate-500'>
            {notifications.length === 0
              ? 'No activity yet'
              : unreadCount > 0
                ? `${unreadCount} unread`
                : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className='flex shrink-0 items-center gap-1'>
            {unreadCount > 0 && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-xs font-normal text-slate-600'
                onClick={() => void markAllRead()}>
                <CheckCheck className='size-3.5' aria-hidden='true' />
                Mark all read
              </Button>
            )}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs font-normal text-slate-500 hover:bg-rose-50 hover:text-rose-700'
              onClick={() => setClearOpen(true)}>
              <Trash2 className='size-3.5' aria-hidden='true' />
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className='mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white no-scrollbar'>
        {notifications.length === 0 ? (
          <div className='px-4 py-10 text-center'>
            <Bell
              className='mx-auto size-4 text-slate-300'
              aria-hidden='true'
            />
            <p className='mt-2 text-xs text-slate-500'>
              You&apos;re all caught up. New activity will show up here.
            </p>
          </div>
        ) : (
          <ul className='divide-y divide-slate-100'>
            {notifications.map(notification => {
              const route = getNotificationRoute(
                notification.type,
                notification.metadata,
              )
              const isUnread = notification.readAt === null

              return (
                <li
                  key={notification.id}
                  className='group flex items-start gap-2 px-3 py-2 hover:bg-slate-50/80'>
                  <span className='mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500'>
                    <NotificationTypeIcon type={notification.type} />
                  </span>
                  <button
                    type='button'
                    className='min-w-0 flex-1 text-left'
                    onClick={() => {
                      void markRead(notification.id)
                      if (route) router.push(route)
                    }}>
                    <span className='flex items-baseline gap-2'>
                      <span
                        className={`min-w-0 truncate text-[13px] leading-5 text-slate-800 ${isUnread ? 'font-medium' : 'font-normal'}`}>
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span className='size-1.5 shrink-0 rounded-full bg-sky-500' />
                      )}
                      <span className='ml-auto shrink-0 text-[11px] text-slate-400'>
                        {formatDistanceToNow(
                          new Date(notification.createdAt),
                          { addSuffix: true },
                        )}
                      </span>
                    </span>
                    <span className='mt-0.5 block truncate text-xs leading-4 text-slate-500'>
                      {notification.body}
                    </span>
                  </button>
                  <button
                    type='button'
                    aria-label='Delete notification'
                    disabled={deletingId === notification.id}
                    className='mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40'
                    onClick={() => void handleDelete(notification.id)}>
                    <Trash2 className='size-3.5' aria-hidden='true' />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ConfirmationDialog
        open={clearOpen}
        setOpen={setClearOpen}
        title='Clear all notifications?'
        description='This removes every notification for you. Other people in the organization keep theirs.'
        confirmLabel='Clear all'
        pendingLabel='Clearing…'
        isPending={clearing}
        keepOpenUntilComplete
        confirmClassName='bg-rose-600 text-white hover:bg-rose-700'
        onConfirm={handleClearAll}
      />
    </div>
  )
}
