'use client'

import { RequirePermission } from '@/components/organization-access'
import Link from 'next/link'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { FollowUpDialog } from '@/components/leads/follow-up-dialog'
import {
  compareFollowUps,
  followUpLabel,
  formatFollowUpDate,
  inQueue,
  queues,
  queueLabels,
  urgency,
  type CounsellorOption,
  type FollowUpItem,
  type FollowUpQueue,
  type LeadOption,
} from '@/lib/leads/follow-ups'

export function FollowUpWorkspace({
  items,
  members,
  leads,
  userId,
  initialNow,
  requestedTask,
  compact = false,
}: {
  items: FollowUpItem[]
  members: CounsellorOption[]
  leads: LeadOption[]
  userId: string
  initialNow: string
  requestedTask?: string
  compact?: boolean
}) {
  const router = useRouter()
  const target = items.find((item) => item.id === requestedTask)
  const [queue, setQueue] = useState<FollowUpQueue>(
    target?.status === 'requested'
      ? 'review'
      : target?.status === 'complete'
        ? 'complete'
        : target?.status === 'cancelled'
          ? 'cancelled'
          : !target && items.some((item) => item.status === 'requested')
            ? 'review'
            : 'all',
  )
  const [counsellor, setCounsellor] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(() => new Date(initialNow))
  const [dialog, setDialog] = useState<{ item: FollowUpItem | null } | null>(
    null,
  )
  const [deleting, setDeleting] = useState<FollowUpItem | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshing, startTransition] = useTransition()
  const [focusTask, setFocusTask] = useState(requestedTask || '')
  useEffect(() => {
    const tick = window.setInterval(() => {
      setNow(new Date())
      startTransition(() => router.refresh())
    }, 60_000)
    return () => window.clearInterval(tick)
  }, [router])
  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  )
  const base = items.filter((item) => {
    if (focusTask && item.id !== focusTask) return false
    if (
      counsellor !== 'all' &&
      item.counsellorId !== (counsellor === 'mine' ? userId : counsellor)
    )
      return false
    const member = item.counsellorId ? memberMap.get(item.counsellorId) : null
    return `${item.leadName} ${item.notes || ''} ${followUpLabel(item.followUpType)} ${member?.name || ''} ${member?.email || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  })
  const filtered = base
    .filter((item) => inQueue(item, queue, now))
    .sort((a, b) => compareFollowUps(a, b, now))
  const pages = Math.max(1, Math.ceil(filtered.length / 12))
  const safePage = Math.min(page, pages)
  const visible = filtered.slice((safePage - 1) * 12, safePage * 12)
  async function mutate(item: FollowUpItem, remove = false) {
    setBusyId(item.id)
    try {
      const response = await fetch(
        `/api/dashboard/leads/${item.leadId}/follow-ups/${item.id}`,
        {
          method: remove ? 'DELETE' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          ...(remove
            ? {}
            : {
                body: JSON.stringify({
                  status: item.status === 'pending' ? 'complete' : 'pending',
                  expectedUpdatedAt: item.updatedAt,
                }),
              }),
        },
      )
      if (!response.ok)
        throw new Error(
          (await response.json()).error || 'Could not update follow-up',
        )
      toast.success(
        remove
          ? 'Follow-up deleted'
          : item.status === 'pending'
            ? 'Follow-up completed'
            : 'Follow-up reopened',
      )
      if (remove) setDeleting(null)
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update follow-up',
      )
    } finally {
      setBusyId(null)
    }
  }
  function clearFilters() {
    setCounsellor('all')
    setQuery('')
    setFocusTask('')
    setQueue('all')
    setPage(1)
  }
  return (
    <section
      className='space-y-4'
      aria-label='Follow-up workspace'
      aria-busy={refreshing}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold text-foreground'>
            {compact ? 'Follow-ups' : 'Counsellor worklist'}
          </h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            Overdue first, then today and upcoming. Oldest created first within
            each group. Times in IST.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            aria-label='Refresh follow-ups'
            disabled={refreshing}
            onClick={() => {
              setNow(new Date())
              startTransition(() => router.refresh())
            }}>
            <RefreshCw
              className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span className='hidden sm:inline'>Refresh</span>
          </Button>
          <RequirePermission permission='operate'>
            <Button
              size='sm'
              className={dashboardButtonClass}
              disabled={!leads.length}
              onClick={() => setDialog({ item: null })}>
              <Plus className='size-4' />
              Add follow-up
            </Button>
          </RequirePermission>
        </div>
      </div>
      <div className='dashboard-surface overflow-hidden rounded-xl'>
        <div
          className='flex flex-wrap gap-1 border-b border-border p-2'
          role='group'
          aria-label='Follow-up queues'>
          {queues.map((value) => (
            <Button
              key={value}
              size='sm'
              variant={queue === value ? 'secondary' : 'ghost'}
              aria-pressed={queue === value}
              className='h-8 gap-1.5 text-xs'
              onClick={() => {
                setQueue(value)
                setPage(1)
                if (value === 'unassigned') setCounsellor('all')
              }}>
              {queueLabels[value]}
              <span
                className={`rounded px-1.5 text-[10px] tabular-nums ${value === 'overdue' && base.some((item) => inQueue(item, value, now)) ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-muted text-muted-foreground'}`}>
                {base.filter((item) => inQueue(item, value, now)).length}
              </span>
            </Button>
          ))}
        </div>
        <div className='flex flex-col gap-3 border-b border-border p-3 sm:flex-row'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-2.5 size-4 text-muted-foreground' />
            <Input
              aria-label='Search follow-ups'
              placeholder='Search lead, activity or notes…'
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              className='h-9 pl-9'
            />
          </div>
          <Select
            value={counsellor}
            onValueChange={(value) => {
              setCounsellor(value)
              setPage(1)
            }}>
            <SelectTrigger
              aria-label='Filter by counsellor'
              className='h-9 w-full sm:w-56'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All counsellors</SelectItem>
              <SelectItem value='mine'>My follow-ups</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name || member.email || 'Organization member'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {focusTask && (
          <div className='flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2 text-xs'>
            <span>
              {target
                ? 'Showing the follow-up from your notification.'
                : 'This follow-up is unavailable or was deleted.'}
            </span>
            <Button size='sm' variant='ghost' onClick={clearFilters}>
              <X className='size-3' />
              Show all
            </Button>
          </div>
        )}
        {visible.length === 0 ? (
          <div className='px-6 py-12 text-center'>
            <CalendarClock className='mx-auto size-8 text-muted-foreground/60' />
            <h3 className='mt-3 text-sm font-medium'>
              {queue === 'review'
                ? 'No requests awaiting review'
                : `No ${queueLabels[queue].toLowerCase()} follow-ups`}
            </h3>
            <p className='mx-auto mt-1 max-w-sm text-xs text-muted-foreground'>
              {query || counsellor !== 'all'
                ? 'Try another counsellor or clear your search.'
                : queue === 'review'
                  ? 'New counselling requests appear here for assignment and scheduling.'
                  : 'Scheduled work will appear here. Add a follow-up to plan the next step.'}
            </p>
            {(query || counsellor !== 'all' || focusTask) && (
              <Button
                variant='outline'
                size='sm'
                className='mt-4'
                onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <ol className='divide-y divide-border'>
            {visible.map((item) => {
              const owner = item.counsellorId
                ? memberMap.get(item.counsellorId)
                : null
              const overdue = urgency(item, now) === 0
              const busy = busyId === item.id || refreshing
              return (
                <li
                  key={item.id}
                  id={`task-${item.id}`}
                  className={`px-4 py-4 ${focusTask === item.id ? 'bg-primary/5' : ''}`}>
                  <div className='flex flex-col justify-between gap-3 md:flex-row'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span
                          className={`size-2 rounded-full ${overdue ? 'bg-rose-500' : item.status === 'complete' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          aria-hidden
                        />
                        <h3 className='text-sm font-semibold'>
                          {followUpLabel(item.followUpType)}
                        </h3>
                        <Badge
                          variant='outline'
                          className={
                            overdue
                              ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                              : ''
                          }>
                          {item.status === 'requested'
                            ? 'Needs review'
                            : overdue
                              ? 'Overdue'
                              : item.status === 'complete'
                                ? 'Completed'
                                : item.status === 'cancelled'
                                  ? 'Cancelled'
                                  : inQueue(item, 'today', now)
                                    ? 'Due today'
                                    : item.scheduledFor
                                      ? 'Upcoming'
                                      : 'Unscheduled'}
                        </Badge>
                        {!item.counsellorId && (
                          <Badge variant='secondary'>Unassigned</Badge>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/users/leads/${item.leadId}`}
                        className='mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline'>
                        {item.leadName}
                      </Link>
                      <div className='mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                        <span
                          className={
                            overdue
                              ? 'font-medium text-rose-700 dark:text-rose-300'
                              : ''
                          }>
                          {formatFollowUpDate(item.scheduledFor)}
                        </span>
                        <span>
                          {owner?.name ||
                            owner?.email ||
                            (item.counsellorId
                              ? 'Former member'
                              : 'No counsellor assigned')}
                        </span>
                        <span>
                          Created {formatFollowUpDate(item.createdAt)}
                        </span>
                      </div>
                      {item.notes &&
                        (item.notes.length > 180 ? (
                          <details className='mt-2 text-xs text-muted-foreground'>
                            <summary className='cursor-pointer font-medium'>
                              Read follow-up notes
                            </summary>
                            <p className='mt-2 whitespace-pre-wrap break-words'>
                              {item.notes}
                            </p>
                          </details>
                        ) : (
                          <p className='mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground'>
                            {item.notes}
                          </p>
                        ))}
                      {(item.outcome || item.completedAt) && (
                        <p className='mt-2 text-xs text-muted-foreground'>
                          {item.outcome
                            ? `Outcome: ${followUpLabel(item.outcome)}`
                            : ''}
                          {item.completedAt
                            ? `${item.outcome ? ' · ' : ''}Completed ${formatFollowUpDate(item.completedAt)}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <div className='flex shrink-0 items-start gap-1.5'>
                      <RequirePermission permission='operate'>
                        <Button
                          variant='outline'
                          size='sm'
                          disabled={busy}
                          onClick={() =>
                            item.status === 'requested'
                              ? setDialog({ item })
                              : void mutate(item)
                          }>
                          {busyId === item.id ? (
                            <Loader2 className='size-3.5 animate-spin' />
                          ) : item.status === 'pending' ? (
                            <Check className='size-3.5' />
                          ) : (
                            <RotateCcw className='size-3.5' />
                          )}
                          {item.status === 'requested'
                            ? 'Review request'
                            : item.status === 'pending'
                              ? 'Complete'
                              : item.sourceRequestId
                                ? 'Send for review'
                                : 'Reopen'}
                        </Button>
                      </RequirePermission>
                      <RequirePermission permission='operate'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          aria-label={`Edit ${followUpLabel(item.followUpType)} for ${item.leadName}`}
                          disabled={busy}
                          onClick={() => setDialog({ item })}>
                          <Edit3 className='size-3.5' />
                        </Button>
                      </RequirePermission>
                      <RequirePermission permission='operate'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8 text-muted-foreground hover:text-destructive'
                          aria-label={`Delete ${followUpLabel(item.followUpType)} for ${item.leadName}`}
                          disabled={busy}
                          onClick={() => setDeleting(item)}>
                          <Trash2 className='size-3.5' />
                        </Button>
                      </RequirePermission>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <div className='flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground'>
          <span role='status'>
            {filtered.length} follow-up{filtered.length === 1 ? '' : 's'} · Page{' '}
            {safePage} of {pages}
          </span>
          <div className='flex gap-1'>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              disabled={safePage === 1}
              aria-label='Previous follow-up page'
              onClick={() => setPage(safePage - 1)}>
              <ChevronLeft className='size-4' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='size-7'
              disabled={safePage === pages}
              aria-label='Next follow-up page'
              onClick={() => setPage(safePage + 1)}>
              <ChevronRight className='size-4' />
            </Button>
          </div>
        </div>
      </div>
      {dialog && (
        <RequirePermission permission='operate'>
          <FollowUpDialog
            item={dialog.item}
            leads={leads}
            members={members}
            onClose={() => setDialog(null)}
          />
        </RequirePermission>
      )}
      <ConfirmationDialog
        open={!!deleting}
        setOpen={(open) => {
          if (!open && !busyId) setDeleting(null)
        }}
        title='Delete follow-up?'
        description='This activity will be removed from the active worklist.'
        confirmLabel='Delete'
        pendingLabel='Deleting…'
        isPending={!!busyId}
        keepOpenUntilComplete
        onConfirm={() =>
          deleting ? mutate(deleting, true) : Promise.resolve()
        }
      />
    </section>
  )
}
