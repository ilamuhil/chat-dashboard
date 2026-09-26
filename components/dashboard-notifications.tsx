'use client'

import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Bell, BellRing, UserRoundPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

function getNotificationRoute(
  type: string,
  metadata: Record<string, unknown>,
): string | null {
  if (type === 'handover_request') {
    const conversationId = metadata.conversationId

    if (typeof conversationId === 'string') {
      return `/dashboard/users/conversations/${conversationId}`
    }
  }

  if (type === 'lead_captured') {
    return '/dashboard/users/leads'
  }

  return null
}

function getNotificationIcon(type: string) {
  if (type === 'lead_captured') {
    return <UserRoundPlus className='mt-0.5 size-4 shrink-0' />
  }

  return <Bell className='mt-0.5 size-4 shrink-0' />
}

export default function DashboardNotifications() {
  const router = useRouter()

  const { notifications, unreadCount, markRead } =
    useDashboardNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : 'Notifications'
          }
          className='group relative size-10 rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 hover:shadow-[0_5px_14px_rgba(14,165,233,0.14)] data-[state=open]:border-sky-200 data-[state=open]:bg-sky-50 data-[state=open]:text-sky-700'>
          <span className='grid size-7 place-items-center rounded-lg bg-slate-50 transition-colors group-hover:bg-white group-data-[state=open]:bg-white'>
            {unreadCount > 0 ? (
              <BellRing className='size-[17px] stroke-[1.8]' />
            ) : (
              <Bell className='size-[17px] stroke-[1.8]' />
            )}
          </span>

          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 flex min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-4 text-white shadow-sm'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        className='w-80 rounded-xl border-slate-200'>
        <DropdownMenuLabel className='text-xs'>
          Notifications
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className='rounded-lg text-xs'>
            No notifications
          </DropdownMenuItem>
        ) : (
          notifications.slice(0, 10).map(notification => {
            const route = getNotificationRoute(
              notification.type,
              notification.metadata,
            )

            const isUnread = notification.readAt === null

            return (
              <DropdownMenuItem
                key={notification.id}
                className='items-start rounded-lg'
                onSelect={() => {
                  void markRead(notification.id)

                  if (route) {
                    router.push(route)
                  }
                }}>
                {getNotificationIcon(notification.type)}

                <span className='min-w-0 flex-1'>
                  <span className='block truncate font-medium'>
                    {notification.title}
                  </span>

                  <span className='mt-0.5 block line-clamp-2 text-xs text-muted-foreground'>
                    {notification.body}
                  </span>

                  <span className='mt-1 block text-[10px] text-muted-foreground'>
                    {formatDistanceToNow(
                      new Date(notification.createdAt),
                      { addSuffix: true },
                    )}
                  </span>
                </span>

                {isUnread && (
                  <span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-600' />
                )}
              </DropdownMenuItem>
            )
          })
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className='justify-center rounded-lg text-xs font-semibold text-sky-700 focus:bg-sky-50 focus:text-sky-800'
          onSelect={() => router.push('/dashboard/notifications')}>
          See all notifications
          <ArrowRight className='ml-1 size-3.5' aria-hidden='true' />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}