'use client'
import {
  RequirePermission,
  useOrganizationAccess,
} from '@/components/organization-access'
import { canEditLeadNote, noteEditVersion } from '@/lib/leads/note-permissions'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MessageSquarePlus, Pencil, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatFollowUpDate, followUpLabel } from '@/lib/leads/follow-ups'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'

export type LeadActivity = {
  id: string
  actorLabel: string
  actorId: string | null
  kind: string
  body: string | null
  details: Record<string, unknown>
  createdAt: string
}
type Conversation = {
  id: string
  createdAt: string
  status: string
  aiSummary?: string | null
}
const eventLabels: Record<string, string> = {
  note: 'Internal note',
  note_edited: 'Internal note edited',
  tracking_started: 'History tracking started',
  lead_created: 'Lead created',
  assignment_changed: 'Counsellor assignment changed',
  stage_changed: 'Pipeline stage changed',
  profile_updated: 'Lead details updated',
  request_created: 'Counselling request received',
  request_confirmed: 'Request confirmed and scheduled',
  request_reopened: 'Request returned for review',
  task_created: 'Follow-up created',
  task_completed: 'Follow-up completed',
  task_cancelled: 'Follow-up cancelled',
  task_updated: 'Follow-up updated',
  task_deleted: 'Follow-up deleted',
}
function displayValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not set'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  if (field.endsWith('_at') || field === 'scheduled_for') {
    const date = String(value)
    return formatFollowUpDate(
      /[zZ]|[+-]\d\d:\d\d$/.test(date) ? date : `${date}Z`,
    )
  }
  return [
    'pipeline_stage',
    'follow_up_type',
    'status',
    'outcome',
    'primary_intent',
    'joining_timeline',
    'enquirer_type',
    'preferred_learning_mode',
  ].includes(field)
    ? followUpLabel(String(value))
    : String(value)
}
function Changes({ details }: { details: Record<string, unknown> }) {
  const changes = details.changes
  if (!changes || typeof changes !== 'object' || Array.isArray(changes))
    return null
  return (
    <dl className='mt-2 space-y-1.5'>
      {Object.entries(changes).map(([field, change]) => {
        if (!change || typeof change !== 'object' || Array.isArray(change))
          return null
        const values = change as Record<string, unknown>
        return (
          <div key={field} className='text-xs'>
            <dt className='inline font-medium capitalize'>
              {field.replace(/_/g, ' ').replace('counsellor id', 'counsellor')}
            </dt>
            <dd className='mt-0.5 break-words whitespace-pre-wrap text-muted-foreground'>
              <span>
                {displayValue(field, values.fromLabel ?? values.from)}
              </span>
              <span aria-label='changed to'> → </span>
              <span>{displayValue(field, values.toLabel ?? values.to)}</span>
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
export function LeadActivityPanel({
  leadId,
  userId,
  initial,
  nextCursor,
  conversations,
}: {
  leadId: string
  userId: string
  initial: LeadActivity[]
  nextCursor: string | null
  conversations: Conversation[]
}) {
  const router = useRouter()
  const { role } = useOrganizationAccess()
  const [editing, setEditing] = useState<{
    id: string
    body: string
    originalBody: string
    version: number
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [updatedNotes, setUpdatedNotes] = useState<
    Record<string, LeadActivity>
  >({})
  const [cached] = useState(initial)
  const [extra, setExtra] = useState<LeadActivity[]>([])
  const [page, setPage] = useState<{
    anchor: string
    cursor: string | null
  } | null>(null)
  const [filter, setFilter] = useState('all')
  const [note, setNote] = useState('')
  const [draftId, setDraftId] = useState(() => crypto.randomUUID())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, startTransition] = useTransition()
  const anchor = initial[0]?.id || ''
  const cursor = page?.anchor === anchor ? page.cursor : nextCursor
  const activities = useMemo(() => {
    const byId = new Map<string, LeadActivity>()
    for (const item of [
      ...cached,
      ...extra,
      ...initial,
      ...Object.values(updatedNotes),
    ]) {
      const existing = byId.get(item.id)
      if (
        item.kind === 'note' &&
        existing &&
        noteEditVersion(existing.details) > noteEditVersion(item.details)
      )
        continue
      byId.set(item.id, item)
    }
    return [...byId.values()].sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        b.id.localeCompare(a.id),
    )
  }, [cached, extra, initial, updatedNotes])
  const rows = [
    ...activities
      .filter(
        (item) =>
          filter === 'all' ||
          (filter === 'notes'
            ? item.kind === 'note' || item.kind === 'note_edited'
            : filter === 'workflow'
              ? item.kind !== 'note'
              : false),
      )
      .map((item) => ({ ...item, conversationId: null as string | null })),
    ...(filter === 'all' || filter === 'conversations'
      ? conversations.map((item) => ({
          id: `conversation-${item.id}`,
          kind: 'conversation',
          body: `Conversation · currently ${item.status}`,
          actorLabel: 'Visitor and team',
          actorId: null,
          createdAt: item.createdAt,
          details: {} as Record<string, unknown>,
          conversationId: item.id,
        }))
      : []),
  ].sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      b.id.localeCompare(a.id),
  )
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!note.trim() || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draftId, body: note.trim() }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save note')
      setExtra((current) => [data.activity, ...current])
      setNote('')
      setDraftId(crypto.randomUUID())
      toast.success('Internal note added')
      startTransition(() => router.refresh())
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Could not save note',
      )
    } finally {
      setSaving(false)
    }
  }
  async function loadOlder() {
    if (!cursor || loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/dashboard/leads/${leadId}/activity?cursor=${encodeURIComponent(cursor)}`,
        { cache: 'no-store' },
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load activity')
      setExtra((current) => [...current, ...data.activities])
      setPage({ anchor, cursor: data.nextCursor })
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load activity',
      )
    } finally {
      setLoading(false)
    }
  }
  async function updateNote(event: React.FormEvent) {
    event.preventDefault()
    if (!editing || !editing.body.trim() || savingEdit) return
    setSavingEdit(true)
    setEditError('')
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}/activity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          body: editing.body.trim(),
          expectedVersion: editing.version,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not update note')
      setUpdatedNotes((current) => ({
        ...current,
        [data.activity.id]: data.activity,
      }))
      if (data.audit) setExtra((current) => [data.audit, ...current])
      setEditing(null)
      toast.success('Internal note updated')
      startTransition(() => router.refresh())
    } catch (cause) {
      setEditError(
        cause instanceof Error
          ? cause.message
          : 'Could not update note. Your draft has been kept.',
      )
    } finally {
      setSavingEdit(false)
    }
  }
  return (
    <section
      className='dashboard-surface overflow-hidden rounded-xl'
      aria-label='Lead notes and activity'
    >
      <div className='flex items-start justify-between gap-3 border-b border-border p-4'>
        <div>
          <h2 className='text-sm font-semibold'>Notes and activity</h2>
          <p className='mt-1 text-xs text-muted-foreground'>
            Internal team notes and a record of who changed what. Earlier
            unrecorded changes cannot be reconstructed.
          </p>
        </div>
        <Button
          variant='ghost'
          size='icon'
          aria-label='Refresh activity'
          disabled={refreshing}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <RequirePermission permission='operate'>
        <form onSubmit={save} className='space-y-2 border-b border-border p-4'>
          <Label htmlFor='internal-lead-note' className='text-xs'>
            Add an internal note
          </Label>
          <Textarea
            id='internal-lead-note'
            maxLength={10000}
            rows={3}
            placeholder='Record useful context for your team, independently of a follow-up.'
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setDraftId(crypto.randomUUID())
            }}
            disabled={saving}
          />
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-xs text-muted-foreground'>
              Notes are internal. Edits retain the previous text in the activity
              history.
            </p>
            <Button
              size='sm'
              className={dashboardButtonClass}
              disabled={!note.trim() || saving}
            >
              {saving ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <MessageSquarePlus className='size-4' />
              )}
              {saving ? 'Saving…' : 'Add note'}
            </Button>
          </div>
        </form>
      </RequirePermission>
      <div
        className='flex flex-wrap gap-1 border-b border-border p-2'
        role='group'
        aria-label='Activity filters'
      >
        {[
          ['all', 'All activity'],
          ['notes', 'Internal notes'],
          ['workflow', 'Workflow'],
          ['conversations', 'Conversations'],
        ].map(([value, label]) => (
          <Button
            key={value}
            size='sm'
            variant={filter === value ? 'secondary' : 'ghost'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {rows.length ? (
        <ol className='divide-y divide-border'>
          {rows.map((item) => (
            <li key={item.id} className='p-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-xs font-semibold'>
                  {item.kind === 'conversation'
                    ? 'Conversation started'
                    : eventLabels[item.kind] || followUpLabel(item.kind)}
                </h3>
                <time
                  className='text-[11px] text-muted-foreground'
                  dateTime={item.createdAt}
                >
                  {formatFollowUpDate(item.createdAt)} IST
                </time>
              </div>
              <p className='mt-1 text-xs text-muted-foreground'>
                {item.actorLabel}
              </p>
              {editing?.id === item.id ? (
                <form className='mt-3 space-y-3' onSubmit={updateNote}>
                  <Label htmlFor={`edit-note-${item.id}`}>
                    Edit internal note
                  </Label>
                  <Textarea
                    id={`edit-note-${item.id}`}
                    value={editing.body}
                    onChange={(event) =>
                      setEditing({ ...editing, body: event.target.value })
                    }
                    maxLength={10000}
                    rows={4}
                    disabled={savingEdit}
                    autoFocus
                  />
                  {editError && (
                    <p role='alert' className='text-xs text-destructive'>
                      {editError}
                    </p>
                  )}
                  <div className='flex justify-end gap-2'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      disabled={savingEdit}
                      onClick={() => {
                        setEditing(null)
                        setEditError('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type='submit'
                      size='sm'
                      className={dashboardButtonClass}
                      disabled={
                        savingEdit ||
                        !editing.body.trim() ||
                        editing.body.trim() === editing.originalBody
                      }
                    >
                      {savingEdit && (
                        <Loader2 className='size-4 animate-spin' />
                      )}
                      {savingEdit ? 'Saving…' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                item.body && (
                  <p className='mt-2 whitespace-pre-wrap break-words text-sm'>
                    {item.body}
                  </p>
                )
              )}
              {item.kind === 'note' && (
                <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
                  {typeof item.details.editedAt === 'string' && (
                    <span className='text-[11px] text-muted-foreground'>
                      Edited {formatFollowUpDate(item.details.editedAt)} IST
                      {typeof item.details.editedByLabel === 'string'
                        ? ` by ${item.details.editedByLabel}`
                        : ''}
                    </span>
                  )}
                  {canEditLeadNote(role, userId, item.actorId) && !editing && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='ml-auto h-7 text-xs'
                      onClick={() => {
                        setEditError('')
                        setEditing({
                          id: item.id,
                          body: item.body || '',
                          originalBody: item.body || '',
                          version: noteEditVersion(item.details),
                        })
                      }}
                    >
                      <Pencil className='size-3' />
                      Edit note
                    </Button>
                  )}
                </div>
              )}
              {item.conversationId ? (
                <Link
                  className='mt-2 inline-block text-xs text-primary hover:underline'
                  href={`/dashboard/users/conversations/${item.conversationId}`}
                >
                  Open conversation
                </Link>
              ) : item.details.changes ? (
                <details className='mt-2 text-xs'>
                  <summary className='cursor-pointer text-muted-foreground'>
                    View recorded details
                  </summary>
                  <Changes details={item.details} />
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className='p-8 text-center text-sm text-muted-foreground'>
          No activity in this view yet.
        </p>
      )}
      {error && (
        <p role='alert' className='px-4 py-2 text-xs text-destructive'>
          {error}
        </p>
      )}
      {cursor && filter !== 'conversations' && (
        <div className='border-t border-border p-3 text-center'>
          <Button
            variant='outline'
            size='sm'
            disabled={loading}
            onClick={() => void loadOlder()}
          >
            {loading && <Loader2 className='size-4 animate-spin' />}
            {loading
              ? 'Loading activity…'
              : error
                ? 'Retry loading older activity'
                : 'Load older activity'}
          </Button>
        </div>
      )}
    </section>
  )
}
