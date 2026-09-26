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
  CheckSquareIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { clientApiAxios } from '@/lib/axios-client'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

type ChatFilter = 'all' | 'open' | 'closed' | 'archived'

type Chats = {
  id: string
  name: string
  email: string
  phone: string
  lastMessageAt: string | null
  highlightSnippet: string | null
  handOverStatus: string | null
  status: string
  isArchived: boolean
}

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
      activeClass: 'border-sky-200 bg-sky-50 text-sky-800',
      inactiveClass: 'border-sky-100 bg-sky-50/40 text-sky-700 hover:bg-sky-50',
      badgeClass: 'bg-sky-100 text-sky-700',
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
      icon: ArchiveIcon,
      activeClass: 'border-slate-300 bg-slate-100 text-slate-800',
      inactiveClass: 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100',
      badgeClass: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'archived',
      label: 'Archived',
      shortLabel: 'Archived',
      icon: ArchiveIcon,
      activeClass: 'border-violet-200 bg-violet-50 text-violet-800',
      inactiveClass: 'border-violet-100 bg-violet-50/40 text-violet-700 hover:bg-violet-50',
      badgeClass: 'bg-violet-100 text-violet-700',
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

export default function ConversationShell(props: {
  chats: Chats[]
  children: ReactNode
}) {
  const { chats, children } = props
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeConversationId = pathname?.split('/').filter(Boolean).at(-1)
  const { notifications, markConversationRead } =
    useDashboardNotifications()

  const [searchQuery, setSearchQuery] = useState('')
  const requestedType = searchParams.get('type')
  const hasServerFilter =
    requestedType === 'open' ||
    requestedType === 'closed' ||
    requestedType === 'archived'
  const activeFilter: ChatFilter =
    requestedType === 'open' ||
    requestedType === 'closed' ||
    requestedType === 'archived'
      ? requestedType
      : 'all'
  const [loadedChats, setLoadedChats] = useState(chats)
  const [loadedFilter, setLoadedFilter] = useState<ChatFilter | null>(
    hasServerFilter ? null : 'all',
  )
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [conversationState, setConversationState] = useState<
    Record<string, ConversationState>
  >({})
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

  useEffect(() => {
    if (!hasServerFilter) {
      return
    }

    let cancelled = false
    void clientApiAxios
      .get<Chats[]>(`/api/dashboard/conversations?type=${activeFilter}`)
      .then(({ data }) => {
        if (!cancelled) {
          setLoadedChats(data)
          setLoadedFilter(activeFilter)
        }
      })
      .catch(error => {
        if (!cancelled) {
          setLoadedFilter(activeFilter)
          toast.error('Could not load conversations')
        }
        console.error('Failed to load filtered conversations', error)
      })

    return () => {
      cancelled = true
    }
  }, [activeFilter, chats, hasServerFilter])

  const getState = (chat: Chats): ConversationState =>
    conversationState[chat.id] ?? {
      status: chat.status === 'closed' ? 'closed' : 'open',
      isArchived: chat.isArchived,
    }

  const visibleBaseChats = useMemo(
    () =>
      (hasServerFilter ? loadedChats : chats).filter(
        chat => !deletedIds.has(chat.id),
      ),
    [chats, deletedIds, hasServerFilter, loadedChats],
  )

  const counts = useMemo(() => {
    const result: Record<ChatFilter, number> = {
      all: visibleBaseChats.length,
      open: 0,
      closed: 0,
      archived: 0,
    }
    for (const chat of visibleBaseChats) {
      const state = getState(chat)
      if (state.isArchived) {
        result.archived += 1
      } else if (state.status === 'closed') {
        result.closed += 1
      } else {
        result.open += 1
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBaseChats, conversationState])

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

  const allVisibleSelected =
    filteredChats.length > 0 &&
    filteredChats.every(chat => selectedIds.has(chat.id))
  const isLoadingFilteredChats =
    hasServerFilter && loadedFilter !== activeFilter

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
        const chat = chats.find(item => item.id === id)
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
        const chat = chats.find(item => item.id === id)
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
    } catch (error) {
      setConversationState(current => {
        const next = { ...current }
        for (const [id, state] of previous) next[id] = state
        return next
      })
      toast.error('Could not update the selected conversations')
      console.error('Failed to update conversations', error)
    } finally {
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

  return (
    <div className='grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)]'>
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

      <aside className='dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xl'>
        <header className='flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3'>
          <div>
            <h2 className='text-sm font-semibold tracking-tight text-foreground'>
              Chats
            </h2>
            <p className='text-xs text-muted-foreground'>
              {visibleBaseChats.length} total · {counts[activeFilter]} in view
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
              title={selectionMode ? 'Exit selection' : 'Select chats'}
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
              placeholder='Search chats…'
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
                  aria-label='Select all visible chats'
                />
                <span className='text-xs font-medium text-sky-900'>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : 'Select chats'}
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
                    className='h-7 rounded-md border-slate-200 bg-white text-xs'>
                    Move to
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='start' className='w-44'>
                  <DropdownMenuLabel className='text-xs'>
                    Conversation status
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
                  className='h-7 rounded-md border-slate-200 bg-white text-xs'
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
                  className='h-7 rounded-md border-slate-200 bg-white text-xs'
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
                  className='h-7 rounded-md border-slate-200 bg-white text-xs'
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
                className='h-7 rounded-md border-rose-200 bg-white text-xs text-rose-600 hover:bg-rose-50'
                onClick={() => requestDelete(selectedList)}>
                <Trash2Icon className='mr-1 size-3.5' />
                Delete
              </Button>
            </div>
          )}
        </div>

        <nav className='mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2 no-scrollbar'>
          {isLoadingFilteredChats ? (
            <div className='space-y-2 px-1 py-2' aria-label='Loading conversations'>
              {[0, 1, 2, 3].map(item => (
                <div
                  key={item}
                  className='flex animate-pulse items-center gap-2 rounded-lg border border-slate-100 bg-white p-2'>
                  <div className='size-8 shrink-0 rounded-lg bg-slate-200' />
                  <div className='min-w-0 flex-1 space-y-2'>
                    <div className='h-2.5 w-2/5 rounded-full bg-slate-200' />
                    <div className='h-2 w-3/5 rounded-full bg-slate-100' />
                  </div>
                </div>
              ))}
              <div className='flex items-center justify-center gap-1.5 py-2 text-[11px] text-slate-400'>
                <LoaderCircleIcon className='size-3 animate-spin text-sky-600' />
                Loading conversations
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
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
            filteredChats.map(chat => {
              const isActive = activeConversationId === chat.id
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

              return (
                <div
                  key={chat.id}
                  className={cn(
                    'group relative flex w-full items-start gap-1.5 rounded-lg border p-2 transition-all duration-200',
                    isActive
                      ? 'border-sky-300 bg-sky-50 shadow-sm ring-1 ring-sky-200/70'
                      : 'border-transparent bg-slate-50/80 hover:border-slate-200 hover:bg-white hover:shadow-sm',
                    isSelected && 'border-sky-300 bg-sky-50/70'
                  )}>
                  {selectionMode && (
                    <div className='pt-2'>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(chat.id)}
                        aria-label={`Select ${chat.name}`}
                      />
                    </div>
                  )}

                  <button
                    type='button'
                    className='min-w-0 flex-1 text-left'
                    onClick={() => {
                      if (selectionMode) {
                        toggleSelect(chat.id)
                        return
                      }

                      void markConversationRead(chat.id)
                      router.push(`/dashboard/users/conversations/${chat.id}`)
                    }}>
                    <div className='flex items-start gap-2'>
                      <div
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-white shadow-sm',
                          isActive
                            ? 'bg-linear-to-br from-sky-500 to-slate-700'
                            : 'bg-linear-to-br from-slate-500 to-slate-700'
                        )}>
                        {getInitials(chat.name)}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-2'>
                          <h3 className='truncate text-xs font-semibold text-foreground'>
                            {chat.name}
                          </h3>
                          {chat.lastMessageAt && (
                            <time
                              suppressHydrationWarning
                              className={cn(
                                'shrink-0 text-[11px]',
                                isActive
                                  ? 'font-medium text-sky-700'
                                  : 'text-muted-foreground'
                              )}>
                              {formatDistanceToNow(new Date(chat.lastMessageAt), {
                                addSuffix: true,
                              })}
                            </time>
                          )}
                        </div>
                        <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
                          {chat.email}
                        </p>
                        <div className='mt-1 flex items-center gap-1'>
                          {state.isArchived ? (
                            <span className='inline-flex rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700'>
                              Archived
                            </span>
                          ) : state.status === 'closed' ? (
                            <span className='inline-flex rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600'>
                              Closed
                            </span>
                          ) : (
                            <span className='inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700'>
                              Open
                            </span>
                          )}
                          {hasAgentRequest && (
                            <span className='inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700'>
                              <span className='size-1.5 rounded-full bg-amber-500' />
                              Agent request
                            </span>
                          )}
                          <p className='min-w-0 flex-1 truncate text-[11px] text-slate-600'>
                            {chat.highlightSnippet ?? 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  {!selectionMode && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={isUpdating}
                          className='size-7 shrink-0 rounded-md opacity-70 hover:bg-slate-100 hover:opacity-100'
                          onClick={e => e.stopPropagation()}>
                          {isUpdating ? (
                            <LoaderCircleIcon className='size-3.5 animate-spin' />
                          ) : (
                            <MoreVerticalIcon className='size-3.5' />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-48'>
                        <DropdownMenuLabel className='text-xs'>
                          Conversation status
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            state.status === 'closed'
                              ? reopenChats([chat.id])
                              : closeChats([chat.id])
                          }>
                          {state.status === 'closed'
                            ? 'Reopen conversation'
                            : 'Close conversation'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {state.isArchived ? (
                          <DropdownMenuItem
                            disabled={isUpdating}
                            onClick={() => unarchiveChats([chat.id])}>
                            {isUpdating ? (
                              <LoaderCircleIcon className='size-3.5 animate-spin' />
                            ) : (
                              <ArchiveRestoreIcon className='size-3.5' />
                            )}
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            disabled={isUpdating}
                            onClick={() => archiveChats([chat.id])}>
                            {isUpdating ? (
                              <LoaderCircleIcon className='size-3.5 animate-spin' />
                            ) : (
                              <ArchiveIcon className='size-3.5' />
                            )}
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className='text-rose-600 focus:text-rose-600'
                          onClick={() => requestDelete([chat.id])}>
                          <Trash2Icon className='size-3.5' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })
          )}
        </nav>
      </aside>

      <div className='min-h-0 min-w-0'>{children}</div>
    </div>
  )
}
