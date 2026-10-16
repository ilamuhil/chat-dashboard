'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  RotateCcwIcon,
  Clock3Icon,
  CheckCircle2Icon,
  CheckSquareIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  dashboardDangerButtonClass,
  dashboardOutlineButtonClass,
} from '@/lib/dashboard-buttons'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { clientApiAxios } from '@/lib/axios-client'
import { useQuery } from '@tanstack/react-query'
import { groupInboxChats, type InboxChat } from '@/lib/conversation-inbox'
import { conversationStatusEvent } from './conversation-status'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

type ChatFilter = 'all' | 'open' | 'closed' | 'archived'

type Chats = InboxChat

const FILTERS: Array<{
  id: ChatFilter
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  activeClass: string
  inactiveClass: string
  badgeClass: string
}> = [
    {
      id: 'open',
      label: 'Open',
      shortLabel: 'Open',
      icon: MessageCircleIcon,
      activeClass:
        'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200',
      inactiveClass:
        'border-sky-100 bg-sky-50/40 text-sky-700 hover:bg-sky-50 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20',
      badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
    },
    {
      id: 'all',
      label: 'All conversations',
      shortLabel: 'All',
      icon: MessageSquareIcon,
      activeClass: 'border-slate-300 bg-slate-100 text-slate-800',
      inactiveClass: 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100',
      badgeClass: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'closed',
      label: 'Closed',
      shortLabel: 'Closed',
      icon: CheckCircle2Icon,
      activeClass: 'border-slate-300 bg-slate-100 text-slate-800',
      inactiveClass: 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100',
      badgeClass: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'archived',
      label: 'Archived',
      shortLabel: 'Archived',
      icon: ArchiveIcon,
      activeClass:
        'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200',
      inactiveClass:
        'border-violet-100 bg-violet-50/40 text-violet-700 hover:bg-violet-50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20',
      badgeClass:
        'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
    },
  ]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

type ConversationState = {
  status: 'open' | 'closed'
  isArchived: boolean
}


type ChatAction = 'close' | 'reopen' | 'archive' | 'unarchive' | 'delete'

const conversationMenuClass =
  'w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border-border/80 bg-popover p-1.5 shadow-xl shadow-black/15'

function ConversationActionItems({ chat, state, busy, onAction }: {
  chat: Chats
  state: ConversationState
  busy: boolean
  onAction: (action: ChatAction) => void
}) {
  const closed = state.status === 'closed'
  const StatusIcon = closed ? RotateCcwIcon : CheckCircle2Icon
  const ArchiveActionIcon = state.isArchived ? ArchiveRestoreIcon : ArchiveIcon
  return (
    <>
      <DropdownMenuLabel className='space-y-1 px-3 py-2.5 font-normal'>
        <p className='truncate text-sm font-semibold text-foreground'>{chat.name}</p>
        <p className='text-[11px] text-muted-foreground'>
          Chat from {new Date(chat.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <p className='text-[11px] text-muted-foreground'>Actions apply to this chat only.</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator className='mx-2 my-1' />
      <DropdownMenuItem disabled={busy} onSelect={() => onAction(closed ? 'reopen' : 'close')}
        className='cursor-pointer gap-3 rounded-xl px-3 py-2.5 focus:bg-accent'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground'>
          <StatusIcon className='size-4' />
        </span>
        <span className='min-w-0'>
          <span className='block text-[13px] font-medium'>{closed ? 'Reopen conversation' : 'Close conversation'}</span>
          <span className='mt-0.5 block text-[11px] text-muted-foreground'>{closed ? 'Continue this chat' : 'Finish this chat and prepare its summary'}</span>
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem disabled={busy} onSelect={() => onAction(state.isArchived ? 'unarchive' : 'archive')}
        className='cursor-pointer gap-3 rounded-xl px-3 py-2.5 focus:bg-accent'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground'>
          <ArchiveActionIcon className='size-4' />
        </span>
        <span>
          <span className='block text-[13px] font-medium'>{state.isArchived ? 'Restore conversation' : 'Archive conversation'}</span>
          <span className='mt-0.5 block text-[11px] text-muted-foreground'>{state.isArchived ? 'Move out of the archive' : 'Keep it in the Archived view'}</span>
        </span>
      </DropdownMenuItem>
      <DropdownMenuSeparator className='mx-2 my-1' />
      <DropdownMenuItem disabled={busy} onSelect={() => onAction('delete')}
        className='cursor-pointer gap-3 rounded-xl px-3 py-2.5 text-rose-600 focus:bg-rose-50 focus:text-rose-700 dark:text-rose-300 dark:focus:bg-rose-500/10 dark:focus:text-rose-200'>
        <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-300'>
          <Trash2Icon className='size-4' />
        </span>
        <span>
          <span className='block text-[13px] font-medium'>Delete chat</span>
          <span className='mt-0.5 block text-[11px] text-muted-foreground'>Remove from your current list</span>
        </span>
      </DropdownMenuItem>
    </>
  )
}

export default function ConversationShell(props: {
  chats: Chats[]
  organizationId: string | null
  children: ReactNode
}) {
  const { chats, children, organizationId } = props
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeConversationId = pathname?.split('/').filter(Boolean).at(-1)
  const { notifications, markConversationRead } =
    useDashboardNotifications()

  const [searchQuery, setSearchQuery] = useState('')
  const requestedType = searchParams.get('type')
  const activeFilter: ChatFilter =
    requestedType === 'open' ||
    requestedType === 'closed' ||
    requestedType === 'archived'
      ? requestedType
      : 'all'
  const { data: loadedChats, refetch } = useQuery({
    queryKey: ['conversation-inbox', organizationId],
    queryFn: async ({ signal }) => {
      const { data } = await clientApiAxios.get<Chats[]>('/api/dashboard/conversations', { signal })
      return data
    },
    initialData: chats,
    refetchInterval: 15_000,
  })
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [conversationState, setConversationState] = useState<
    Record<string, ConversationState>
  >({})
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const contextTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    chatId: string
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    const refresh = () => { void refetch() }
    window.addEventListener(conversationStatusEvent, refresh)
    return () => window.removeEventListener(conversationStatusEvent, refresh)
  }, [refetch])

  const getState = (chat: Chats): ConversationState =>
    conversationState[chat.id] ?? {
      status: chat.status === 'closed' ? 'closed' : 'open',
      isArchived: chat.isArchived,
    }

  const visibleBaseChats = useMemo(
    () => loadedChats.filter(chat => !deletedIds.has(chat.id)).map(chat => ({
      ...chat, ...conversationState[chat.id],
    })),
    [deletedIds, loadedChats, conversationState],
  )

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return visibleBaseChats.filter(chat => {
      const state = getState(chat)
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'archived'
            ? state.isArchived
            : !state.isArchived && state.status === activeFilter

      if (!matchesFilter) return false
      if (!query) return true

      const haystack = [
        chat.name,
        chat.email,
        chat.phone,
        chat.highlightSnippet,
        state.status,
        state.isArchived ? 'archived' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBaseChats, conversationState, activeFilter, searchQuery])

  const groupedChats = useMemo(
    () => groupInboxChats(filteredChats, visibleBaseChats),
    [filteredChats, visibleBaseChats],
  )
  const inboxRows = selectionMode
    ? filteredChats.map(chat => ({ key: chat.id, chat, chats: [chat] }))
    : groupedChats
  const allVisibleSelected = filteredChats.length > 0 &&
    filteredChats.every(chat => selectedIds.has(chat.id))

  const clearSelection = () => setSelectedIds(new Set())

  const exitSelectionMode = () => {
    setSelectionMode(false)
    clearSelection()
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredChats.forEach(chat => next.delete(chat.id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredChats.forEach(chat => next.add(chat.id))
        return next
      })
    }
  }

  const updateConversationState = async (
    ids: string[],
    patch: Partial<ConversationState>,
    message: string,
  ) => {
    if (ids.length === 0) return

    const previous = new Map(
      ids.map(id => {
        const chat = visibleBaseChats.find(item => item.id === id)
        return [
          id,
          chat
            ? getState(chat)
            : ({ status: 'open', isArchived: false } satisfies ConversationState),
        ]
      }),
    )
    setUpdatingIds(current => new Set([...current, ...ids]))
    setConversationState(current => {
      const next = { ...current }
      for (const id of ids) {
        const chat = visibleBaseChats.find(item => item.id === id)
        if (!chat) continue
        next[id] = { ...getState(chat), ...patch }
      }
      return next
    })

    try {
      await Promise.all(
        ids.map(id =>
          clientApiAxios.patch(`/api/dashboard/conversations/${id}`, patch),
        ),
      )
      toast.success(message)
      clearSelection()
      if (patch.status) {
        window.dispatchEvent(
          new CustomEvent(conversationStatusEvent, {
            detail: {
              ids,
              status: patch.status,
              closedBy: patch.status === 'closed' ? 'support_agent' : null,
            },
          }),
        )
      }
    } catch (error) {
      setConversationState(current => {
        const next = { ...current }
        for (const [id, state] of previous) next[id] = state
        return next
      })
      toast.error('Could not update the selected conversations')
      console.error('Failed to update conversations', error)
    } finally {
      await refetch()
      setConversationState(current => {
        const next = { ...current }
        ids.forEach(id => delete next[id])
        return next
      })
      setUpdatingIds(current => {
        const next = new Set(current)
        ids.forEach(id => next.delete(id))
        return next
      })
    }
  }

  const closeChats = (ids: string[]) =>
    void updateConversationState(
      ids,
      { status: 'closed' },
      ids.length === 1 ? 'Conversation closed' : `${ids.length} conversations closed`,
    )

  const reopenChats = (ids: string[]) =>
    void updateConversationState(
      ids,
      { status: 'open' },
      ids.length === 1 ? 'Conversation reopened' : `${ids.length} conversations reopened`,
    )

  const archiveChats = (ids: string[]) =>
    void updateConversationState(
      ids,
      { isArchived: true },
      ids.length === 1 ? 'Conversation archived' : `${ids.length} conversations archived`,
    )

  const unarchiveChats = (ids: string[]) =>
    void updateConversationState(
      ids,
      { isArchived: false },
      ids.length === 1 ? 'Conversation restored' : `${ids.length} conversations restored`,
    )

  const requestDelete = (ids: string[]) => {
    if (ids.length === 0) return
    setPendingDeleteIds(ids)
    setConfirmDeleteOpen(true)
  }

  const confirmDelete = () => {
    const idsToDelete = [...pendingDeleteIds]
    setDeletedIds(prev => {
      const next = new Set(prev)
      idsToDelete.forEach(id => next.add(id))
      return next
    })
    toast.success(
      idsToDelete.length === 1
        ? 'Chat deleted'
        : `${idsToDelete.length} chats deleted`
    )
    setPendingDeleteIds([])
    clearSelection()
    setConfirmDeleteOpen(false)

    const activeId = pathname?.split('/').pop()
    if (activeId && idsToDelete.includes(activeId)) {
      router.push('/dashboard/users/conversations')
    }
  }

  const selectedList = Array.from(selectedIds)
  const contextChat = contextMenu
    ? visibleBaseChats.find(chat => chat.id === contextMenu.chatId) ?? null
    : null

  const runChatAction = (chat: Chats, action: ChatAction) => {
    const actions = {
      close: closeChats, reopen: reopenChats, archive: archiveChats,
      unarchive: unarchiveChats, delete: requestDelete,
    }
    actions[action]([chat.id])
    setContextMenu(null)
  }

  useEffect(() => {
    if (!contextMenu) return
    const closeOnScroll = () => setContextMenu(null)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => window.removeEventListener('scroll', closeOnScroll, true)
  }, [contextMenu])

  return (
    <div className='grid h-full min-h-0 grid-cols-1 grid-rows-2 gap-3 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)] lg:grid-rows-1'>
      <ConfirmationDialog
        open={confirmDeleteOpen}
        setOpen={setConfirmDeleteOpen}
        title={
          pendingDeleteIds.length === 1
            ? 'Delete chat?'
            : `Delete ${pendingDeleteIds.length} chats?`
        }
        description='This will remove the selected conversations from your list. This UI action is local until the API is connected.'
        onConfirm={confirmDelete}
      />

      <aside className='dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xl dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900'>
        <header className='flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3'>
          <div>
            <h2 className='text-sm font-semibold tracking-tight text-foreground'>
              Lead inbox
            </h2>
            <p className='text-xs text-muted-foreground'>
              {groupedChats.length} {groupedChats.length === 1 ? 'entry' : 'entries'} in view · {filteredChats.length} {filteredChats.length === 1 ? 'chat' : 'chats'}
            </p>
          </div>
          <div className='flex items-center gap-1'>
            <Button
              type='button'
              variant={selectionMode ? 'default' : 'ghost'}
              size='icon'
              className={cn(
                'size-8 rounded-lg',
                selectionMode
                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
              title={selectionMode ? 'Exit selection' : 'Select individual chats'}
              onClick={() => {
                if (selectionMode) exitSelectionMode()
                else setSelectionMode(true)
              }}>
              <CheckSquareIcon className='size-4' />
            </Button>
          </div>
        </header>

        {/* Category filters */}
        <div className='shrink-0 border-b border-slate-100 px-3 py-3'>
          <div className='no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5'>
            {FILTERS.map(filter => {
              const Icon = filter.icon
              const isActive = activeFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type='button'
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    if (filter.id === 'all') params.delete('type')
                    else params.set('type', filter.id)
                    const query = params.toString()
                    router.push(query ? `${pathname}?${query}` : pathname)
                    clearSelection()
                  }}
                  className={cn(
                    'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? filter.activeClass
                      : filter.inactiveClass,
                  )}>
                  <Icon className='size-3.5' />
                  <span>{filter.shortLabel}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className='shrink-0 space-y-2 px-3 pt-3'>
          <div className='relative'>
            <SearchIcon className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Search leads or chat details…'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='h-9 border-slate-200 pr-3 pl-9 text-sm shadow-sm'
            />
          </div>

          {selectionMode && (
            <div className='flex items-center justify-between gap-2 rounded-lg border border-sky-200/70 bg-sky-50/80 px-2.5 py-2'>
              <div className='flex items-center gap-2'>
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAllVisible}
                  aria-label='Select all visible individual chats'
                />
                <span className='text-xs font-medium text-sky-900'>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : 'Select individual chats'}
                </span>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 px-2 text-xs text-sky-800 hover:bg-sky-100'
                onClick={exitSelectionMode}>
                <XIcon className='mr-1 size-3.5' />
                Cancel
              </Button>
            </div>
          )}

          {selectionMode && selectedIds.size > 0 && (
            <div className='flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 p-2'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className={cn(
                      dashboardOutlineButtonClass,
                      'h-7 rounded-md text-xs',
                    )}>
                    Move to
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-44'>
                  <DropdownMenuLabel className='text-xs'>
                    Selected individual chats
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => closeChats(selectedList)}>
                    Close conversations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => reopenChats(selectedList)}>
                    Reopen conversations
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {activeFilter === 'archived' ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={selectedList.some(id => updatingIds.has(id))}
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-7 rounded-md text-xs',
                  )}
                  onClick={() => unarchiveChats(selectedList)}>
                  {selectedList.some(id => updatingIds.has(id)) ? (
                    <LoaderCircleIcon className='mr-1 size-3.5 animate-spin' />
                  ) : (
                    <ArchiveRestoreIcon className='mr-1 size-3.5' />
                  )}
                  {selectedList.some(id => updatingIds.has(id))
                    ? 'Restoring…'
                    : 'Unarchive'}
                </Button>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={selectedList.some(id => updatingIds.has(id))}
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-7 rounded-md text-xs',
                  )}
                  onClick={() => archiveChats(selectedList)}>
                  {selectedList.some(id => updatingIds.has(id)) ? (
                    <LoaderCircleIcon className='mr-1 size-3.5 animate-spin' />
                  ) : (
                    <ArchiveIcon className='mr-1 size-3.5' />
                  )}
                  {selectedList.some(id => updatingIds.has(id))
                    ? 'Archiving…'
                    : 'Archive'}
                </Button>
              )}

              {activeFilter !== 'archived' && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={selectedList.some(id => updatingIds.has(id))}
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-7 rounded-md text-xs',
                  )}
                  onClick={() => closeChats(selectedList)}>
                  {selectedList.some(id => updatingIds.has(id)) && (
                    <LoaderCircleIcon className='mr-1 size-3.5 animate-spin' />
                  )}
                  {selectedList.some(id => updatingIds.has(id))
                    ? 'Closing…'
                    : 'Close'}
                </Button>
              )}

              <Button
                type='button'
                variant='outline'
                size='sm'
                className={cn(
                  dashboardDangerButtonClass,
                  'h-7 rounded-md text-xs',
                )}
                onClick={() => requestDelete(selectedList)}>
                <Trash2Icon className='mr-1 size-3.5' />
                Delete
              </Button>
            </div>
          )}
        </div>

        <nav className='mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 pb-3 no-scrollbar'>
          {filteredChats.length === 0 ? (
            <div className='flex flex-col items-center justify-center px-4 py-12 text-center'>
              <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
                <MessageSquareIcon className='size-4' />
              </div>
              <p className='text-sm font-medium text-foreground'>
                {visibleBaseChats.length === 0
                  ? 'No conversations yet'
                  : `No ${FILTERS.find(f => f.id === activeFilter)?.label.toLowerCase()} chats`}
              </p>
              <p className='mt-1 text-xs text-muted-foreground'>
                {visibleBaseChats.length === 0
                  ? 'Chats will show up here once visitors talk to your bot.'
                  : searchQuery
                    ? 'Try a different search term.'
                    : 'Move chats here from another category or archive view.'}
              </p>
            </div>
          ) : (
            inboxRows.map(({ key, chat, chats: groupChats }) => {
              const isActive = groupChats.some(item => activeConversationId === item.id)
              const state = getState(chat)
              const isSelected = selectedIds.has(chat.id)
              const isUpdating = updatingIds.has(chat.id)
              const hasUnreadAgentRequest = notifications.some(
                notification =>
                  notification.type === 'handover_request' &&
                  notification.metadata.conversationId === chat.id &&
                  !notification.readAt
              )

              const hasAgentRequest =
                chat.handOverStatus === 'requested' ||
                ((chat.handOverStatus === null ||
                  chat.handOverStatus === 'none') &&
                  hasUnreadAgentRequest)

              const openCount = groupChats.filter(item => item.status === 'open' && !item.isArchived).length
              const StatusIcon = state.isArchived ? ArchiveIcon : CheckCircle2Icon
              const activityAt = chat.lastMessageAt ?? chat.createdAt

              return (
                <div
                  key={key}
                  onContextMenu={event => {
                    if (selectionMode) return
                    event.preventDefault()
                    contextTriggerRef.current = event.currentTarget.querySelector('button')
                    const bounds = event.currentTarget.getBoundingClientRect()
                    setContextMenu({
                      chatId: chat.id,
                      x: event.clientX || bounds.left + bounds.width / 2,
                      y: event.clientY || bounds.top + bounds.height / 2,
                    })
                  }}
                  className={cn(
                    'group relative rounded-xl border transition-colors duration-150',
                    isActive || isSelected
                      ? 'border-sky-300 bg-sky-50 shadow-sm dark:border-sky-400/40 dark:bg-sky-500/10'
                      : 'border-border/60 bg-card hover:border-sky-300/70 hover:bg-accent/40 dark:hover:border-sky-400/30',
                  )}>
                  {(isActive || isSelected) && <span aria-hidden='true' className='absolute inset-y-3 left-0 w-0.5 rounded-full bg-sky-500' />}
                  {selectionMode && (
                    <Checkbox className='absolute top-6 left-3 z-10'
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(chat.id)}
                      aria-label={`Select ${chat.name}, chat from ${new Date(chat.createdAt).toLocaleString()}`} />
                  )}
                  <button
                    type='button'
                    className={cn('block w-full min-w-0 rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background', selectionMode && 'pl-10')}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelect(chat.id)
                        return
                      }
                      void markConversationRead(chat.id)
                      const query = searchParams.toString()
                      router.push(`/dashboard/users/conversations/${chat.id}${query ? `?${query}` : ''}`)
                    }}>
                    <div className={cn('flex min-w-0 items-center gap-2.5', !selectionMode && 'pr-7')}>
                      <div aria-hidden='true' className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border text-xs font-semibold',
                        isActive
                          ? 'border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/15 dark:text-sky-200'
                          : 'border-border/70 bg-muted text-foreground',
                      )}>{getInitials(chat.name)}</div>
                      <div className='min-w-0 flex-1'>
                        <h3 title={chat.name} className='truncate text-[13px] font-semibold leading-5 text-foreground'>{chat.name}</h3>
                        <p title={chat.email} className='mt-0.5 truncate text-[11px] leading-4 text-muted-foreground'>{chat.email}</p>
                      </div>
                    </div>
                    {chat.highlightSnippet && <p className='mt-2.5 line-clamp-2 break-words text-xs leading-5 text-muted-foreground'>{chat.highlightSnippet}</p>}
                    {hasAgentRequest && (
                      <p className='mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-800 dark:text-amber-200'>
                        <span className='size-1.5 rounded-full bg-amber-500' />Agent requested
                      </p>
                    )}
                    <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10px] font-medium'>
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5',
                        state.isArchived ? 'bg-violet-500/10 text-violet-700 dark:text-violet-200'
                          : state.status === 'closed' ? 'bg-muted text-muted-foreground'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200')}>
                        {state.isArchived || state.status === 'closed' ? <StatusIcon className='size-3' /> : <span className='mx-0.5 size-1.5 rounded-full bg-emerald-500' />}
                        {state.isArchived ? 'Archived' : state.status === 'closed' ? 'Closed' : 'Open'}
                      </span>
                      {!selectionMode && (
                        <span className='inline-flex items-center gap-1 text-muted-foreground'>
                          <MessageSquareIcon className='size-3' />
                          {groupChats.length} {groupChats.length === 1 ? 'chat' : 'chats'}
                          {openCount > 0 ? ` · ${openCount} open` : ''}
                        </span>
                      )}
                      <span className='ml-auto inline-flex items-center gap-1 text-muted-foreground'>
                        <Clock3Icon className='size-3' />
                        <time dateTime={activityAt} suppressHydrationWarning className='tabular-nums'>
                          {formatDistanceToNowStrict(new Date(activityAt), { addSuffix: true })}
                        </time>
                      </span>
                    </div>
                  </button>
                  {!selectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type='button' variant='ghost' size='icon' disabled={isUpdating}
                          aria-label={`Actions for ${chat.name} displayed chat`}
                          className='absolute top-3 right-2 size-7 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground data-[state=open]:bg-background data-[state=open]:text-foreground'>
                          {isUpdating ? <LoaderCircleIcon className='size-3.5 animate-spin' /> : <MoreVerticalIcon className='size-4' />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' sideOffset={8} collisionPadding={12} className={conversationMenuClass}>
                        <ConversationActionItems chat={chat} state={state} busy={isUpdating} onAction={action => runChatAction(chat, action)} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })
          )}
        </nav>
        {contextMenu &&
          contextChat &&
          !selectionMode &&
          createPortal(
            <DropdownMenu open onOpenChange={open => { if (!open) setContextMenu(null) }}>
              <DropdownMenuTrigger asChild>
                <button type='button' tabIndex={-1} aria-label={`${contextChat.name} context actions`}
                  className='pointer-events-none fixed size-px opacity-0'
                  style={{ left: contextMenu.x, top: contextMenu.y }} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' sideOffset={4} collisionPadding={12} className={conversationMenuClass}
                onCloseAutoFocus={event => {
                  event.preventDefault()
                  contextTriggerRef.current?.focus()
                }}>
                <ConversationActionItems chat={contextChat} state={getState(contextChat)}
                  busy={updatingIds.has(contextChat.id)} onAction={action => runChatAction(contextChat, action)} />
              </DropdownMenuContent>
            </DropdownMenu>,
            document.body,
          )}
      </aside>

      <div className='h-full min-h-0 min-w-0'>{children}</div>
    </div>
  )
}
