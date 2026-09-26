'use client'

import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, UserRoundPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
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
    <UserRoundPlus className='size-4' aria-hidden='true' />
  ) : (
    <Bell className='size-4' aria-hidden='true' />
  )
}

export default function DashboardNotificationsPage() {
  const router = useRouter()
  const { notifications, unreadCount, markRead, markAllRead } =
    useDashboardNotifications()

  return (
    <div className='mx-auto w-full max-w-3xl'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.14em] text-sky-700'>
            Activity
          </p>
          <h1 className='mt-1 text-2xl font-semibold tracking-tight text-slate-950'>
            Notifications
          </h1>
          <p className='mt-1 text-sm text-slate-500'>
            Stay up to date with activity across your organization.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='shrink-0 rounded-lg border-slate-200 bg-white text-xs'
            onClick={() => void markAllRead()}>
            <CheckCheck className='mr-1.5 size-3.5' aria-hidden='true' />
            Mark all read
          </Button>
        )}
      </div>

      <div className='mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm'>
        {notifications.length === 0 ? (
          <div className='px-6 py-16 text-center'>
            <div className='mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200'>
              <Bell className='size-5' aria-hidden='true' />
            </div>
            <h2 className='mt-4 text-sm font-semibold text-slate-900'>
              You&apos;re all caught up
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              New organization activity will appear here.
            </p>
          </div>
        ) : (
          <div className='divide-y divide-slate-100'>
            {notifications.map(notification => {
              const route = getNotificationRoute(
                notification.type,
                notification.metadata,
              )
              const isUnread = notification.readAt === null

              return (
                <button
                  key={notification.id}
                  type='button'
                  className='flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50'
                  onClick={() => {
                    void markRead(notification.id)
                    if (route) router.push(route)
                  }}>
                  <span className='mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100'>
                    <NotificationTypeIcon type={notification.type} />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='flex items-start justify-between gap-3'>
                      <span className='font-medium text-slate-900'>
                        {notification.title}
                      </span>
                      {isUnread && (
                        <span className='mt-1.5 size-2 shrink-0 rounded-full bg-sky-600' />
                      )}
                    </span>
                    <span className='mt-1 block text-sm leading-6 text-slate-600'>
                      {notification.body}
                    </span>
                    <span className='mt-2 block text-xs text-slate-400'>
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
