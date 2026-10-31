export type FollowUpItem = {
  id: string
  leadId: string
  leadName: string
  leadPriority: string | null
  sourceRequestId?: string | null
  counsellorId: string | null
  followUpType: string | null
  status: string | null
  scheduledFor: string | null
  completedAt: string | null
  outcome: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}
export type CounsellorOption = {
  userId: string
  name: string | null
  email: string | null
}
export type LeadOption = {
  id: string
  name: string | null
  assignedCounsellorId: string | null
  consentToContact?: boolean | null
  email?: string | null
  phone?: string | null
}
export const WORKSPACE_TIME_ZONE = 'Asia/Kolkata'
export const queues = [
  'review',
  'all',
  'today',
  'upcoming',
  'overdue',
  'complete',
  'unassigned',
  'unscheduled',
  'cancelled',
] as const
export type FollowUpQueue = (typeof queues)[number]
export const queueLabels: Record<FollowUpQueue, string> = {
  review: 'Needs review',
  all: 'Open',
  today: 'Due today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  complete: 'Completed',
  unassigned: 'Unassigned',
  unscheduled: 'Unscheduled',
  cancelled: 'Cancelled',
}
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WORKSPACE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
export function inQueue(item: FollowUpItem, queue: FollowUpQueue, now: Date) {
  if (queue === 'review') return item.status === 'requested'
  if (queue === 'complete' || queue === 'cancelled')
    return item.status === queue
  if (item.status !== 'pending') return false
  if (queue === 'all') return true
  if (queue === 'unassigned') return !item.counsellorId
  if (queue === 'unscheduled') return !item.scheduledFor
  if (!item.scheduledFor) return false
  const date = new Date(item.scheduledFor)
  if (queue === 'overdue') return date < now
  if (queue === 'today') return dayKey(date) === dayKey(now)
  return dayKey(date) > dayKey(now)
}
export function urgency(item: FollowUpItem, now: Date) {
  if (item.status !== 'pending') return 4
  if (!item.scheduledFor) return 3
  if (new Date(item.scheduledFor) < now) return 0
  return dayKey(new Date(item.scheduledFor)) === dayKey(now) ? 1 : 2
}
export function compareFollowUps(a: FollowUpItem, b: FollowUpItem, now: Date) {
  return (
    urgency(a, now) - urgency(b, now) ||
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    a.id.localeCompare(b.id)
  )
}
export function followUpLabel(value: string | null) {
  return (value || 'other')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .replace('elligibility', 'eligibility')
}
export function formatFollowUpDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: WORKSPACE_TIME_ZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'No schedule'
}
// HTML datetime-local has no zone. The workspace deliberately uses IST on every device.
export function toWorkspaceInput(value: string | null) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: WORKSPACE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
  return parts.replace(' ', 'T')
}
export function fromWorkspaceInput(value: string) {
  return value ? new Date(`${value}:00+05:30`).toISOString() : null
}
