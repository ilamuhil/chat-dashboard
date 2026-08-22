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
  FlameIcon,
  InboxIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  SearchIcon,
  SnowflakeIcon,
  SunMediumIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useDashboardNotifications } from '@/app/dashboard/notifications/NotificationProvider'

type LeadCategory = 'hot' | 'warm' | 'cold' | 'unassigned'
type ChatFilter = LeadCategory | 'archived'

type Chats = {
  id: string
  name: string
  email: string
  phone: string
  lastMessageAt: string | null
  highlightSnippet: string | null
  handOverStatus: string | null
}

type ChatMeta = {
  category: LeadCategory
  archived: boolean
}

const FILTERS: Array<{
  id: ChatFilter
  label: string
  shortLabel: string
  icon: React.ComponentType<{ className?: string }>
  activeClass: string
  badgeClass: string
}> = [
    {
      id: 'unassigned',
      label: 'Unassigned',
      shortLabel: 'Unassigned',
      icon: InboxIcon,
      activeClass: 'border-slate-300 bg-slate-100 text-slate-800',
      badgeClass: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'hot',
      label: 'Hot leads',
      shortLabel: 'Hot',
      icon: FlameIcon,
      activeClass: 'border-rose-200 bg-rose-50 text-rose-800',
      badgeClass: 'bg-rose-100 text-rose-700',
    },
    {
      id: 'warm',
      label: 'Warm leads',
      shortLabel: 'Warm',
      icon: SunMediumIcon,
      activeClass: 'border-amber-200 bg-amber-50 text-amber-800',
      badgeClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'cold',
      label: 'Cold leads',
      shortLabel: 'Cold',
      icon: SnowflakeIcon,
      activeClass: 'border-sky-200 bg-sky-50 text-sky-800',
      badgeClass: 'bg-sky-100 text-sky-700',
    },
    {
      id: 'archived',
      label: 'Archived',
      shortLabel: 'Archived',
      icon: ArchiveIcon,
      activeClass: 'border-violet-200 bg-violet-50 text-violet-800',
      badgeClass: 'bg-violet-100 text-violet-700',
    },
  ]

const CATEGORY_LABEL: Record<LeadCategory, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  unassigned: 'Unassigned',
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function categoryChipClass(category: LeadCategory) {
  switch (category) {
    case 'hot':
      return 'bg-rose-50 text-rose-700 border-rose-200'
    case 'warm':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'cold':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

export default function ConversationShell(props: {
  chats: Chats[]
  children: ReactNode
}) {
  const { chats, children } = props
  const router = useRouter()
  const pathname = usePathname()
  const activeConversationId = pathname?.split('/').filter(Boolean).at(-1)
  const { notifications, markConversationRead } =
    useDashboardNotifications()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ChatFilter>('unassigned')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [chatMeta, setChatMeta] = useState<Record<string, ChatMeta>>({})
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

  const getMeta = (id: string): ChatMeta =>
    chatMeta[id] ?? { category: 'unassigned', archived: false }

  const visibleBaseChats = useMemo(
    () => chats.filter(chat => !deletedIds.has(chat.id)),
    [chats, deletedIds]
  )

  const counts = useMemo(() => {
    const result: Record<ChatFilter, number> = {
      unassigned: 0,
      hot: 0,
      warm: 0,
      cold: 0,
      archived: 0,
    }
    for (const chat of visibleBaseChats) {
      const meta = getMeta(chat.id)
      if (meta.archived) {
        result.archived += 1
      } else {
        result[meta.category] += 1
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBaseChats, chatMeta])

  const filteredChats = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return visibleBaseChats.filter(chat => {
      const meta = getMeta(chat.id)
      const matchesFilter =
        activeFilter === 'archived'
          ? meta.archived
          : !meta.archived && meta.category === activeFilter

      if (!matchesFilter) return false
      if (!query) return true

      const haystack = [
        chat.name,
        chat.email,
        chat.phone,
        chat.highlightSnippet,
        CATEGORY_LABEL[meta.category],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBaseChats, chatMeta, activeFilter, searchQuery])

  const allVisibleSelected =
    filteredChats.length > 0 &&
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

  const updateChats = (ids: string[], patch: Partial<ChatMeta>, message: string) => {
    setChatMeta(prev => {
      const next = { ...prev }
      for (const id of ids) {
        next[id] = { ...getMeta(id), ...patch }
      }
      return next
    })
    toast.success(message)
    clearSelection()
  }

  const setCategory = (ids: string[], category: LeadCategory) => {
    updateChats(
      ids,
      { category, archived: false },
      ids.length === 1
        ? `Moved to ${CATEGORY_LABEL[category]}`
        : `${ids.length} chats moved to ${CATEGORY_LABEL[category]}`
    )
  }

  const archiveChats = (ids: string[]) => {
    updateChats(
      ids,
      { archived: true },
      ids.length === 1 ? 'Chat archived' : `${ids.length} chats archived`
    )
  }

  const unarchiveChats = (ids: string[]) => {
    updateChats(
      ids,
      { archived: false },
      ids.length === 1 ? 'Chat restored' : `${ids.length} chats restored`
    )
  }

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
                    setActiveFilter(filter.id)
                    clearSelection()
                  }}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? filter.activeClass
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}>
                  <Icon className='size-3.5' />
                  <span>{filter.shortLabel}</span>
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                      isActive ? filter.badgeClass : 'bg-slate-100 text-slate-500'
                    )}>
                    {counts[filter.id]}
                  </span>
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
                    Lead category
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCategory(selectedList, 'hot')}>
                    <FlameIcon className='size-3.5 text-rose-500' />
                    Hot leads
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategory(selectedList, 'warm')}>
                    <SunMediumIcon className='size-3.5 text-amber-500' />
                    Warm leads
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCategory(selectedList, 'cold')}>
                    <SnowflakeIcon className='size-3.5 text-sky-500' />
                    Cold leads
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCategory(selectedList, 'unassigned')}>
                    <InboxIcon className='size-3.5 text-slate-500' />
                    Unassigned
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {activeFilter === 'archived' ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 rounded-md border-slate-200 bg-white text-xs'
                  onClick={() => unarchiveChats(selectedList)}>
                  <ArchiveRestoreIcon className='mr-1 size-3.5' />
                  Unarchive
                </Button>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-7 rounded-md border-slate-200 bg-white text-xs'
                  onClick={() => archiveChats(selectedList)}>
                  <ArchiveIcon className='mr-1 size-3.5' />
                  Archive
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

        <nav className='mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2 pb-3 no-scrollbar'>
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
            filteredChats.map(chat => {
              const isActive = activeConversationId === chat.id
              const meta = getMeta(chat.id)
              const isSelected = selectedIds.has(chat.id)
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
                    'group relative flex w-full items-start gap-2 rounded-lg border p-2.5 transition-all duration-200',
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
                    <div className='flex items-start gap-2.5'>
                      <div
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm',
                          isActive
                            ? 'bg-linear-to-br from-sky-500 to-slate-700'
                            : 'bg-linear-to-br from-slate-500 to-slate-700'
                        )}>
                        {getInitials(chat.name)}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-2'>
                          <h3 className='truncate text-sm font-semibold text-foreground'>
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
                        <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                          {chat.email}
                        </p>
                        <div className='mt-1.5 flex items-center gap-1.5'>
                          {!meta.archived && (
                            <span
                              className={cn(
                                'inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                categoryChipClass(meta.category)
                              )}>
                              {CATEGORY_LABEL[meta.category]}
                            </span>
                          )}
                          {meta.archived && (
                            <span className='inline-flex rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700'>
                              Archived
                            </span>
                          )}
                          {hasAgentRequest && (
                            <span className='inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700'>
                              <span className='size-1.5 rounded-full bg-amber-500' />
                              Agent request
                            </span>
                          )}
                          <p className='min-w-0 flex-1 truncate text-xs text-slate-600'>
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
                          className='size-7 shrink-0 rounded-md opacity-70 hover:bg-slate-100 hover:opacity-100'
                          onClick={e => e.stopPropagation()}>
                          <MoreVerticalIcon className='size-3.5' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-48'>
                        <DropdownMenuLabel className='text-xs'>
                          Categorize
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setCategory([chat.id], 'hot')}>
                          <FlameIcon className='size-3.5 text-rose-500' />
                          Hot lead
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCategory([chat.id], 'warm')}>
                          <SunMediumIcon className='size-3.5 text-amber-500' />
                          Warm lead
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCategory([chat.id], 'cold')}>
                          <SnowflakeIcon className='size-3.5 text-sky-500' />
                          Cold lead
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCategory([chat.id], 'unassigned')}>
                          <InboxIcon className='size-3.5 text-slate-500' />
                          Unassigned
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {meta.archived ? (
                          <DropdownMenuItem
                            onClick={() => unarchiveChats([chat.id])}>
                            <ArchiveRestoreIcon className='size-3.5' />
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => archiveChats([chat.id])}>
                            <ArchiveIcon className='size-3.5' />
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
