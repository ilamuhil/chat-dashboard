'use client'

import { RequirePermission } from '@/components/organization-access'
import {
  LeadActivityPanel,
  type LeadActivity,
} from '@/components/leads/activity-panel'
import { nextActionLabel } from '@/lib/leads/next-action'
import { Textarea } from '@/components/ui/textarea'

import SummaryMarkdown from '@/components/summary-markdown'
import { format } from 'date-fns'
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  CopyIcon,
  DatabaseIcon,
  Edit3Icon,
  ExternalLinkIcon,
  GraduationCapIcon,
  Loader2Icon,
  MailIcon,
  MessageSquareTextIcon,
  PhoneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  UserRoundIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { FollowUpWorkspace } from '@/components/leads/follow-up-workspace'
import { FollowUpDialog } from '@/components/leads/follow-up-dialog'
import { OwnerSelect } from '@/components/leads/owner-select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { cn } from '@/lib/core/utils'

type NullableString = string | null

export type LeadFollowUp = {
  id: string
  sourceRequestId?: NullableString
  counsellorId: NullableString
  followUpType: NullableString
  status: NullableString
  scheduledFor: NullableString
  completedAt: NullableString
  outcome: NullableString
  notes: NullableString
  createdAt: string
  updatedAt: string
}

export type LeadConversation = {
  id: string
  createdAt: string
  lastMessageAt: NullableString
  lastMessageSnippet: NullableString
  userName: NullableString
  userEmail: NullableString
  mode: string
  status: string
  isArchived: boolean
  handOverStatus: NullableString
  closedAt: NullableString
  bot: { name: string } | null
}

export type LeadDetail = {
  customAnswers: Record<
    string,
    { label: string; value: string | number | boolean }
  >
  profileVersion: number
  activities: LeadActivity[]
  activityCursor: string | null
  lostReason: NullableString
  id: string
  name: NullableString
  email: NullableString
  phone: NullableString
  enquirerType: NullableString
  studentName: NullableString
  studentAge: NullableString
  studentGender: NullableString
  courseInterest: NullableString
  educationLevel: NullableString
  preferredMode: NullableString
  joiningTimeline: NullableString
  joiningPreferenceDetails: NullableString
  primaryIntent: NullableString
  leadPriority: NullableString
  assignedCounsellorId: NullableString
  priorityReason: NullableString
  aiSummary: NullableString
  recommendedNextAction: NullableString
  pipelineStage: NullableString
  consentToContact: boolean | null
  capturedAt: string
  updatedAt: string
  deletedAt: NullableString
  deletedById: NullableString
  visitorId: NullableString
  organizationId: NullableString
  botId: NullableString
  bot: {
    id: string
    name: string
    instituteName: NullableString
  } | null
  conversations: LeadConversation[]
  followUps: LeadFollowUp[]
}

export type OrganizationMemberOption = {
  id: string
  userId: string
  name: NullableString
  email: NullableString
  role: NullableString
}

type Option = { value: string; label: string }

const enquirerTypes: Option[] = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'student', label: 'Student' },
  { value: 'friend', label: 'Friend' },
  { value: 'relative', label: 'Relative' },
  { value: 'other', label: 'Other' },
]

const preferredModes: Option[] = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'both', label: 'Online and offline (legacy)' },
]

const joiningTimelines: Option[] = [
  { value: 'as_soon_as_possible', label: 'As soon as possible' },
  { value: 'next_available_intake', label: 'Next available intake' },
  { value: 'next_academic_year', label: 'Next academic year' },
  { value: 'specific_period', label: 'Specific period' },
  { value: 'exploring', label: 'Exploring' },
  { value: 'immediate', label: 'Immediately' },
  { value: 'within_1_week', label: 'Within 1 week' },
  { value: 'within_1_month', label: 'Within 1 month' },
  { value: 'within_3_months', label: 'Within 3 months' },
  { value: 'beyond_3_months', label: 'Beyond 3 months' },
]

const primaryIntents: Option[] = [
  { value: 'course_info', label: 'Course information' },
  { value: 'course_recommendation', label: 'Course recommendation' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'elligibility', label: 'Eligibility (legacy)' },
  { value: 'fees', label: 'Fees' },
  { value: 'batch_or_schedule', label: 'Batch or schedule' },
  { value: 'application', label: 'Application' },
  { value: 'counselling', label: 'Counselling' },
  { value: 'demo', label: 'Demo' },
  { value: 'campus_visit', label: 'Campus visit' },
  { value: 'general_enquiry', label: 'General enquiry' },
  { value: 'other', label: 'Other' },
]

const priorities: Option[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
]

const pipelineStages: Option[] = [
  { value: 'new_enquiry', label: 'New enquiry' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'counselling_requested', label: 'Counselling requested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'application_started', label: 'Application started' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]

function optionLabel(value: NullableString, options?: Option[]) {
  if (!value) return 'Not provided'
  return (
    options?.find((option) => option.value === value)?.label ??
    value
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}

function formatDate(value: NullableString, fallback = 'Not recorded') {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? fallback
    : format(parsed, 'dd MMM yyyy · h:mm a')
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return data?.error || 'Something went wrong. Please try again.'
}

const actionButtonClass = cn(
  dashboardButtonClass,
  'h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium',
)
const copyButtonClass = cn(
  actionButtonClass,
  'size-6 rounded-md px-0 shadow-none',
)

function DetailField({
  label,
  value,
  children,
  className,
  kind = 'text',
}: {
  label: string
  value?: string | null
  children?: React.ReactNode
  className?: string
  kind?: 'text' | 'contact' | 'numeric' | 'date' | 'narrative'
}) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <p className='text-[10px] font-semibold tracking-wide text-slate-400 uppercase'>
        {label}
      </p>
      {children ?? (
        <p
          className={cn(
            'wrap-break-word text-xs leading-5 text-slate-800',
            kind === 'contact' && 'font-medium text-sky-800',
            kind === 'numeric' &&
              'font-mono font-medium tabular-nums text-slate-700',
            kind === 'date' && 'font-medium tabular-nums text-slate-600',
            kind === 'narrative' &&
              'whitespace-pre-wrap font-medium leading-5 text-slate-700',
            !value && 'text-slate-500',
          )}>
          {value || 'Not provided'}
        </p>
      )}
    </div>
  )
}

function CopyableValue({
  label,
  value,
  fallback = 'Not provided',
}: {
  label: string
  value: NullableString
  fallback?: string
}) {
  async function copyValue() {
    if (!value) return

    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard access is unavailable')
      }
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div
      className={cn(
        'flex min-w-0 max-w-full items-center gap-1.5 rounded-md border px-2 py-1',
        value
          ? 'border-slate-200/80 bg-slate-50/90'
          : 'border-slate-100 bg-slate-50/50',
      )}>
      <code
        className={cn(
          'min-w-0 flex-1 truncate font-mono text-[10px] font-medium tracking-[-0.01em] text-slate-700',
          !value && 'font-sans text-slate-500',
        )}
        title={value || fallback}>
        {value || fallback}
      </code>
      {value && (
        <Button
          type='button'
          size='icon'
          className={copyButtonClass}
          aria-label={`Copy ${label}`}
          title={`Copy ${label}`}
          onClick={copyValue}>
          <CopyIcon className='size-3' />
        </Button>
      )}
    </div>
  )
}

function CopyableId({
  label,
  value,
  fallback,
  className,
}: {
  label: string
  value: NullableString
  fallback?: string
  className?: string
}) {
  return (
    <DetailField label={label} className={className}>
      <CopyableValue label={label} value={value} fallback={fallback} />
    </DetailField>
  )
}

function DetailSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('dashboard-surface overflow-hidden rounded-lg', className)}>
      <div className='flex items-start gap-2.5 border-b border-slate-100 px-4 py-3'>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100'>
          <Icon className='size-3.5' />
        </div>
        <div>
          <h2 className='text-xs font-semibold text-slate-900'>{title}</h2>
          <p className='mt-0.5 text-[11px] leading-4 text-muted-foreground'>
            {description}
          </p>
        </div>
      </div>
      <div className='p-4'>{children}</div>
    </section>
  )
}

function statusClass(status: NullableString) {
  const base =
    'h-4 rounded px-1.5 py-0 text-[10px] font-semibold leading-none tracking-wide shadow-none'
  if (status === 'complete' || status === 'enrolled')
    return cn(
      base,
      'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-500/15 dark:text-emerald-300',
    )
  if (status === 'cancelled' || status === 'lost')
    return cn(base, 'border-slate-200 bg-slate-100 text-slate-600')
  if (status === 'pending')
    return cn(
      base,
      'border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200',
    )
  return cn(
    base,
    'border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200',
  )
}

function StatusBadge({
  value,
  options,
  fallback = 'Not set',
}: {
  value: NullableString
  options?: Option[]
  fallback?: string
}) {
  return (
    <Badge variant='outline' className={statusClass(value)}>
      {value ? optionLabel(value, options) : fallback}
    </Badge>
  )
}

export default function LeadDetailClient({
  lead,
  members,
  userId,
  initialNow,
}: {
  userId: string
  initialNow: string
  lead: LeadDetail
  members: OrganizationMemberOption[]
}) {
  const [editLeadOpen, setEditLeadOpen] = useState(false)
  const [followUpOpen, setFollowUpOpen] = useState(false)
  function openCreateFollowUp() {
    setFollowUpOpen(true)
  }

  return (
    <div className='space-y-3 pb-6'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <Button asChild className={cn(actionButtonClass, 'w-fit')}>
          <Link href='/dashboard/users/leads'>
            <ArrowLeftIcon className='size-4' />
            Back to leads
          </Link>
        </Button>
        <div className='flex flex-wrap gap-2'>
          <RequirePermission permission='operate'>
            <Button
              onClick={() => setEditLeadOpen(true)}
              className={actionButtonClass}>
              <Edit3Icon className='size-4' />
              Edit lead
            </Button>
          </RequirePermission>
          <RequirePermission permission='operate'>
            <Button onClick={openCreateFollowUp} className={actionButtonClass}>
              <PlusIcon className='size-4' />
              Add follow-up
            </Button>
          </RequirePermission>
        </div>
      </div>

      <div className='dashboard-surface flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3'>
        <div>
          <p className='text-xs font-semibold'>Assigned counsellor</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Owns this lead. Follow-ups can be assigned separately.
          </p>
        </div>
        <OwnerSelect
          leadId={lead.id}
          leadName={lead.name || 'lead'}
          ownerId={lead.assignedCounsellorId}
          members={members}
        />
      </div>

      <div className='rounded-xl border border-border bg-muted/30 px-4 py-3'>
        <p className='text-xs font-medium text-muted-foreground'>
          Recommended next action
        </p>
        <p className='mt-1 text-sm font-semibold'>
          {nextActionLabel(lead.recommendedNextAction)}
        </p>
        {lead.pipelineStage === 'lost' && (
          <p className='mt-2 whitespace-pre-wrap text-xs text-muted-foreground'>
            Lost reason:{' '}
            {lead.lostReason ||
              'Not recorded before reason tracking was introduced.'}
          </p>
        )}
      </div>

      <section className='overflow-hidden rounded-xl border border-sky-100 bg-linear-to-br from-sky-50 via-white to-indigo-50/60 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-700 text-base font-semibold text-white shadow-sm'>
              {(lead.name || lead.studentName || 'L').charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <h2 className='truncate text-lg font-semibold tracking-tight text-slate-950'>
                  {lead.name || 'Unnamed lead'}
                </h2>
                <StatusBadge
                  value={lead.pipelineStage}
                  options={pipelineStages}
                />
                {lead.leadPriority && (
                  <Badge
                    variant='outline'
                    className={cn(
                      'h-4 rounded px-1.5 py-0 text-[10px] font-semibold leading-none tracking-wide shadow-none',
                      lead.leadPriority === 'hot' &&
                        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-200',
                      lead.leadPriority === 'warm' &&
                        'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-400/25 dark:bg-orange-500/15 dark:text-orange-200',
                      lead.leadPriority === 'cold' &&
                        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-500/15 dark:text-sky-200',
                    )}>
                    {optionLabel(lead.leadPriority, priorities)} priority
                  </Badge>
                )}
              </div>
              <p className='mt-0.5 text-xs text-slate-600'>
                {lead.courseInterest || 'Course interest not captured'}
              </p>
              <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600'>
                <span className='inline-flex items-center gap-1.5'>
                  <MailIcon className='size-3 text-slate-400' />
                  {lead.email || 'Email not provided'}
                </span>
                <span className='inline-flex items-center gap-1.5'>
                  <PhoneIcon className='size-3 text-slate-400' />
                  {lead.phone || 'Phone not provided'}
                </span>
              </div>
            </div>
          </div>
          <div className='shrink-0 text-left sm:text-right'>
            <p className='text-[11px] font-semibold tracking-wide text-slate-400 uppercase'>
              Captured
            </p>
            <p className='mt-0.5 text-[11px] font-medium text-slate-700'>
              {formatDate(lead.capturedAt)}
            </p>
            <p className='mt-1 text-[10px] text-slate-500'>
              {lead.bot
                ? `via ${lead.bot.name}`
                : 'Added manually or source removed'}
            </p>
          </div>
        </div>
      </section>

      <div className='grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]'>
        <div className='space-y-3'>
          <div className='grid gap-3 md:grid-cols-2'>
            <DetailSection
              title='Contact'
              description='Enquirer details and communication consent.'
              icon={UserRoundIcon}>
              <div className='grid gap-3 sm:grid-cols-2'>
                <DetailField label='Full name' value={lead.name} />
                <DetailField
                  label='Enquirer type'
                  value={optionLabel(lead.enquirerType, enquirerTypes)}
                />
                <DetailField label='Email' value={lead.email} kind='contact' />
                <DetailField label='Phone' value={lead.phone} kind='contact' />
                <DetailField label='Consent to contact'>
                  <Badge
                    variant='outline'
                    className={cn(
                      statusClass(
                        lead.consentToContact ? 'complete' : 'cancelled',
                      ),
                      'gap-1',
                    )}>
                    {lead.consentToContact ? (
                      <CheckCircle2Icon className='size-3' />
                    ) : (
                      <ShieldCheckIcon className='size-3' />
                    )}
                    {lead.consentToContact === null
                      ? 'Not recorded'
                      : lead.consentToContact
                        ? 'Granted'
                        : 'Not granted'}
                  </Badge>
                </DetailField>
              </div>
            </DetailSection>

            <DetailSection
              title='Student'
              description='Information about the prospective student.'
              icon={GraduationCapIcon}>
              <div className='grid gap-3 sm:grid-cols-2'>
                <DetailField label='Student name' value={lead.studentName} />
                <DetailField
                  label='Joining preference details'
                  value={lead.joiningPreferenceDetails}
                />
                <DetailField
                  label='Age'
                  value={lead.studentAge}
                  kind='numeric'
                />
                <DetailField label='Gender' value={lead.studentGender} />
                <DetailField
                  label='Education level'
                  value={lead.educationLevel}
                />
              </div>
            </DetailSection>
          </div>

          <DetailSection
            title='Admissions preferences'
            description='Programme interest, intent, timing, and study mode.'
            icon={ClipboardListIcon}>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <DetailField
                label='Course interest'
                value={lead.courseInterest}
              />
              <DetailField
                label='Education level'
                value={lead.educationLevel}
              />
              <DetailField
                label='Preferred mode'
                value={optionLabel(lead.preferredMode, preferredModes)}
              />
              <DetailField
                label='Joining timeline'
                value={optionLabel(lead.joiningTimeline, joiningTimelines)}
              />
              <DetailField
                label='Primary intent'
                value={optionLabel(lead.primaryIntent, primaryIntents)}
              />
            </div>
          </DetailSection>

          <DetailSection
            title='Pipeline'
            description='Qualification state and recommended next step.'
            icon={TargetIcon}>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              <DetailField label='Pipeline stage'>
                <StatusBadge
                  value={lead.pipelineStage}
                  options={pipelineStages}
                />
              </DetailField>
              <DetailField label='Lead priority'>
                <StatusBadge value={lead.leadPriority} options={priorities} />
              </DetailField>
              <DetailField
                label='Recommended action'
                value={nextActionLabel(lead.recommendedNextAction)}
              />
              <DetailField
                label='Priority reason'
                value={lead.priorityReason || 'No priority reason recorded'}
                kind='narrative'
                className='sm:col-span-2 lg:col-span-3'
              />
            </div>
          </DetailSection>

          <DetailSection
            title='Lead summary'
            description='Consolidated across this visitor’s chats. Updated after a conversation closes.'
            icon={SparklesIcon}>
            {lead.aiSummary ? (
              <SummaryMarkdown source={lead.aiSummary} />
            ) : (
              <p className='text-sm text-muted-foreground'>
                No AI summary is available for this lead.
              </p>
            )}
          </DetailSection>
        </div>

        <div className='space-y-3'>
          <DetailSection
            title='Source metadata'
            description='Read-only capture and system information.'
            icon={DatabaseIcon}>
            <div className='space-y-3'>
              <DetailField
                label='Source bot'
                value={
                  lead.bot?.name || 'Manual entry or source bot unavailable'
                }
              />
              <DetailField
                label='Institute'
                value={lead.bot?.instituteName || 'Not provided by source bot'}
              />
              <CopyableId label='Lead ID' value={lead.id} />
              <CopyableId
                label='Visitor ID'
                value={lead.visitorId}
                fallback='No visitor ID recorded'
              />
              <CopyableId
                label='Bot ID'
                value={lead.botId}
                fallback='No source bot ID recorded'
              />
              <CopyableId
                label='Organization ID'
                value={lead.organizationId}
                fallback='No organization ID recorded'
              />
              <DetailField
                label='Captured at'
                value={formatDate(lead.capturedAt)}
                kind='date'
              />
              <DetailField
                label='Last updated'
                value={formatDate(lead.updatedAt)}
                kind='date'
              />
              <DetailField label='Record status'>
                <StatusBadge
                  value={lead.deletedAt ? 'cancelled' : 'complete'}
                  options={[
                    { value: 'complete', label: 'Active' },
                    { value: 'cancelled', label: 'Deleted' },
                  ]}
                />
              </DetailField>
              <DetailField
                label='Deleted at'
                value={formatDate(lead.deletedAt, 'Not deleted')}
                kind='date'
              />
              <CopyableId
                label='Deleted by'
                value={lead.deletedById}
                fallback='Not applicable — active lead'
              />
            </div>
          </DetailSection>
        </div>
      </div>

      <FollowUpWorkspace
        compact
        userId={userId}
        initialNow={initialNow}
        members={members}
        leads={[
          {
            id: lead.id,
            name: lead.name,
            assignedCounsellorId: lead.assignedCounsellorId,
            consentToContact: lead.consentToContact,
            email: lead.email,
            phone: lead.phone,
          },
        ]}
        items={lead.followUps.map((item) => ({
          ...item,
          leadId: lead.id,
          leadName: lead.name || lead.studentName || 'Unnamed lead',
          leadPriority: lead.leadPriority,
        }))}
      />

      {Object.keys(lead.customAnswers).length > 0 && (
        <section className='rounded-xl border border-border bg-card p-5'>
          <h2 className='mb-4 text-sm font-semibold'>Qualification answers</h2>
          <dl className='grid gap-4 sm:grid-cols-2'>
            {Object.entries(lead.customAnswers).map(([id, answer]) => (
              <div key={id}>
                <dt className='text-xs text-muted-foreground'>
                  {answer.label}
                </dt>
                <dd className='mt-1 break-words text-sm'>
                  {typeof answer.value === 'boolean'
                    ? answer.value
                      ? 'Yes'
                      : 'No'
                    : String(answer.value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <LeadActivityPanel
        key={lead.id}
        leadId={lead.id}
        userId={userId}
        initial={lead.activities}
        nextCursor={lead.activityCursor}
        conversations={lead.conversations}
      />

      <DetailSection
        title='Linked conversations'
        description='Conversations associated with this lead, newest activity first.'
        icon={MessageSquareTextIcon}>
        {lead.conversations.length === 0 ? (
          <div className='rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center'>
            <MessageSquareTextIcon className='mx-auto size-7 text-slate-300' />
            <p className='mt-2 text-xs font-medium text-slate-800'>
              No linked conversations
            </p>
            <p className='mt-1 text-[11px] text-slate-500'>
              A conversation will appear here when it is linked to this lead.
            </p>
          </div>
        ) : (
          <div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200'>
            {lead.conversations.map((conversation) => (
              <article
                key={conversation.id}
                className='group flex flex-col gap-2 bg-white p-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between'>
                <Link
                  href={`/dashboard/users/conversations/${conversation.id}`}
                  className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='truncate text-xs font-semibold text-slate-900'>
                      {conversation.userName ||
                        conversation.userEmail ||
                        'Anonymous visitor'}
                    </p>
                    <StatusBadge value={conversation.status} />
                    {conversation.isArchived && (
                      <StatusBadge value='archived' />
                    )}
                  </div>
                  <p className='mt-1 line-clamp-2 text-[11px] text-slate-500'>
                    {conversation.lastMessageSnippet ||
                      'No message preview is available.'}
                  </p>
                  <div className='mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4 text-slate-400'>
                    <span>{conversation.bot?.name || 'Bot unavailable'}</span>
                    <span>Mode: {optionLabel(conversation.mode)}</span>
                    <span className='inline-flex items-center gap-1'>
                      Handover:
                      <StatusBadge value={conversation.handOverStatus} />
                    </span>
                  </div>
                </Link>
                <div className='flex min-w-0 shrink-0 flex-col gap-1.5 sm:items-end'>
                  <CopyableId label='Conversation ID' value={conversation.id} />
                  <Link
                    href={`/dashboard/users/conversations/${conversation.id}`}
                    className='flex items-center gap-1.5 text-[11px] text-slate-500'>
                    {formatDate(
                      conversation.lastMessageAt,
                      `Created ${formatDate(conversation.createdAt)}`,
                    )}
                    <ExternalLinkIcon className='size-3 text-slate-400 transition-colors group-hover:text-sky-600' />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </DetailSection>

      {editLeadOpen && (
        <LeadEditDialog lead={lead} open onOpenChange={setEditLeadOpen} />
      )}
      {followUpOpen && (
        <FollowUpDialog
          item={null}
          members={members}
          leads={[
            {
              id: lead.id,
              name: lead.name,
              assignedCounsellorId: lead.assignedCounsellorId,
              consentToContact: lead.consentToContact,
              email: lead.email,
              phone: lead.phone,
            },
          ]}
          onClose={() => setFollowUpOpen(false)}
        />
      )}
    </div>
  )
}

type LeadFormState = {
  name: string
  email: string
  phone: string
  enquirerType: string
  studentName: string
  studentAge: string
  studentGender: string
  courseInterest: string
  educationLevel: string
  preferredMode: string
  joiningTimeline: string
  joiningPreferenceDetails: string
  primaryIntent: string
  leadPriority: string
  priorityReason: string
  lostReason: string
  pipelineStage: string
  consentToContact: boolean
}

function leadFormState(lead: LeadDetail): LeadFormState {
  return {
    name: lead.name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    enquirerType: lead.enquirerType ?? 'none',
    studentName: lead.studentName ?? '',
    studentAge: lead.studentAge ?? '',
    studentGender: lead.studentGender ?? '',
    courseInterest: lead.courseInterest ?? '',
    educationLevel: lead.educationLevel ?? '',
    preferredMode: lead.preferredMode ?? 'none',
    joiningTimeline: lead.joiningTimeline ?? 'none',
    joiningPreferenceDetails: lead.joiningPreferenceDetails ?? '',
    primaryIntent: lead.primaryIntent ?? 'none',
    leadPriority: lead.leadPriority ?? 'none',
    priorityReason: lead.priorityReason ?? '',
    lostReason: lead.lostReason || '',
    pipelineStage: lead.pipelineStage ?? 'none',
    consentToContact: lead.consentToContact ?? false,
  }
}

function optionalValue(value: string) {
  return value === 'none' || value.trim() === '' ? null : value.trim()
}

const formLabelClass = 'text-[11px] font-semibold tracking-wide text-slate-500'
const formControlClass =
  'rounded-lg border-slate-200 bg-white shadow-none focus-visible:border-sky-400 focus-visible:ring-sky-100'

function FormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
      <div className='flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3'>
        <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 ring-1 ring-sky-100'>
          <Icon className='size-3.5' />
        </div>
        <div className='min-w-0'>
          <h3 className='text-sm font-semibold tracking-[-0.01em] text-slate-900'>
            {title}
          </h3>
          <p className='text-[11px] leading-4 text-slate-500'>{description}</p>
        </div>
      </div>
      <div className='grid gap-3.5 p-4 sm:grid-cols-2'>{children}</div>
    </section>
  )
}

function FormField({
  id,
  label,
  required,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id} className={formLabelClass}>
        {label}
        {required ? <span className='ml-0.5 text-rose-500'>*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function FormSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  allowNone = true,
  className,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled: boolean
  allowNone?: boolean
  className?: string
}) {
  return (
    <FormField id={id} label={label} className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={cn('w-full text-sm', formControlClass)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value='none'>Not set</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

function LeadEditDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: LeadDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [formState, setFormState] = useState(() => leadFormState(lead))
  const [expectedProfileVersion] = useState(lead.profileVersion)
  const [isSaving, setIsSaving] = useState(false)

  function setField<K extends keyof LeadFormState>(
    field: K,
    value: LeadFormState[K],
  ) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSaving) return
    if (nextOpen) setFormState(leadFormState(lead))
    onOpenChange(nextOpen)
  }

  async function saveLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!formState.name.trim()) {
      toast.error('Lead name cannot be blank')
      return
    }
    if (!formState.email.trim() && !formState.phone.trim()) {
      toast.error('Enter at least an email address or phone number')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedProfileVersion,
          name: formState.name.trim(),
          email: optionalValue(formState.email),
          phone: optionalValue(formState.phone),
          enquirerType: optionalValue(formState.enquirerType),
          studentName: optionalValue(formState.studentName),
          studentAge: optionalValue(formState.studentAge),
          studentGender: optionalValue(formState.studentGender),
          courseInterest: optionalValue(formState.courseInterest),
          educationLevel: optionalValue(formState.educationLevel),
          preferredMode: optionalValue(formState.preferredMode),
          joiningTimeline: optionalValue(formState.joiningTimeline),
          joiningPreferenceDetails: optionalValue(
            formState.joiningPreferenceDetails,
          ),
          primaryIntent: optionalValue(formState.primaryIntent),
          lostReason:
            formState.pipelineStage === 'lost'
              ? optionalValue(formState.lostReason)
              : null,
          pipelineStage: optionalValue(formState.pipelineStage),
          ...(formState.consentToContact !== (lead.consentToContact ?? false)
            ? { consentToContact: formState.consentToContact }
            : {}),
        }),
      })
      if (!response.ok) throw new Error(await readError(response))

      toast.success('Lead updated successfully')
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update lead',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='no-scrollbar max-h-[92vh] gap-4 overflow-y-auto sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>
            Update contact, admissions, and pipeline details. System metadata
            stays read-only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={saveLead} className='space-y-4'>
          <FormSection
            title='Contact'
            description='Name is required. Add an email or phone number.'
            icon={UserRoundIcon}>
            <FormField id='edit-lead-name' label='Full name' required>
              <Input
                id='edit-lead-name'
                required
                maxLength={200}
                value={formState.name}
                onChange={(event) => setField('name', event.target.value)}
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <FormSelect
              id='edit-enquirer-type'
              label='Enquirer type'
              value={formState.enquirerType}
              options={enquirerTypes}
              onChange={(value) => setField('enquirerType', value)}
              disabled={isSaving}
            />
            <FormField id='edit-lead-email' label='Email'>
              <Input
                id='edit-lead-email'
                type='email'
                value={formState.email}
                onChange={(event) => setField('email', event.target.value)}
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <FormField id='edit-lead-phone' label='Phone'>
              <Input
                id='edit-lead-phone'
                type='tel'
                maxLength={50}
                value={formState.phone}
                onChange={(event) => setField('phone', event.target.value)}
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800'>
              <div>
                <Label htmlFor='edit-consent' className={formLabelClass}>
                  Consent to contact
                </Label>
                <p className='mt-0.5 text-[11px] text-slate-500 dark:text-slate-400'>
                  The lead has agreed to receive follow-up communication.
                </p>
              </div>
              <Switch
                id='edit-consent'
                checked={formState.consentToContact}
                onCheckedChange={(value) => setField('consentToContact', value)}
                disabled={isSaving}
              />
            </div>
          </FormSection>

          <FormSection
            title='Student and admissions'
            description='Who the enquiry is for and what they want to study.'
            icon={GraduationCapIcon}>
            <FormField id='edit-student-name' label='Student name'>
              <Input
                id='edit-student-name'
                maxLength={200}
                value={formState.studentName}
                onChange={(event) =>
                  setField('studentName', event.target.value)
                }
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <div className='grid grid-cols-2 gap-3'>
              <FormField id='edit-student-age' label='Age'>
                <Input
                  id='edit-student-age'
                  maxLength={50}
                  value={formState.studentAge}
                  onChange={(event) =>
                    setField('studentAge', event.target.value)
                  }
                  disabled={isSaving}
                  className={formControlClass}
                />
              </FormField>
              <FormField id='edit-student-gender' label='Gender'>
                <Input
                  id='edit-student-gender'
                  maxLength={50}
                  value={formState.studentGender}
                  onChange={(event) =>
                    setField('studentGender', event.target.value)
                  }
                  disabled={isSaving}
                  className={formControlClass}
                />
              </FormField>
            </div>
            <FormField id='edit-course-interest' label='Course interest'>
              <Input
                id='edit-course-interest'
                maxLength={300}
                value={formState.courseInterest}
                onChange={(event) =>
                  setField('courseInterest', event.target.value)
                }
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <FormField id='edit-education-level' label='Education level'>
              <Input
                id='edit-education-level'
                maxLength={200}
                value={formState.educationLevel}
                onChange={(event) =>
                  setField('educationLevel', event.target.value)
                }
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <FormSelect
              id='edit-preferred-mode'
              label='Preferred mode'
              value={formState.preferredMode}
              options={preferredModes}
              onChange={(value) => setField('preferredMode', value)}
              disabled={isSaving}
            />
            <FormSelect
              id='edit-joining-timeline'
              label='Joining timeline'
              value={formState.joiningTimeline}
              options={joiningTimelines}
              onChange={(value) => setField('joiningTimeline', value)}
              disabled={isSaving}
            />
            <FormField
              id='edit-joining-details'
              label='Joining preference details'>
              <Input
                id='edit-joining-details'
                value={formState.joiningPreferenceDetails}
                onChange={(event) =>
                  setField('joiningPreferenceDetails', event.target.value)
                }
                maxLength={2000}
                disabled={isSaving}
                className={formControlClass}
              />
            </FormField>
            <FormSelect
              id='edit-primary-intent'
              label='Primary intent'
              value={formState.primaryIntent}
              options={primaryIntents}
              onChange={(value) => setField('primaryIntent', value)}
              disabled={isSaving}
              className='sm:col-span-2'
            />
          </FormSection>

          <FormSection
            title='Pipeline and insight'
            description='Stage, priority, and the notes that explain the lead.'
            icon={SparklesIcon}>
            <FormSelect
              id='edit-pipeline-stage'
              label='Pipeline stage'
              value={formState.pipelineStage}
              options={pipelineStages}
              onChange={(value) => setField('pipelineStage', value)}
              disabled={isSaving}
            />
            <p className='text-xs text-muted-foreground'>
              Priority is calculated from the lead’s accepted facts. The reason
              updates when you save.
            </p>
            <p className='text-xs text-muted-foreground sm:col-span-2'>
              The next action is calculated from accepted facts and the current
              follow-up workflow.
            </p>
            {formState.pipelineStage === 'lost' && (
              <FormField
                id='edit-lost-reason'
                label='Why was this lead lost?'
                required
                className='sm:col-span-2'>
                <Textarea
                  id='edit-lost-reason'
                  required
                  rows={3}
                  maxLength={2000}
                  value={formState.lostReason}
                  onChange={(event) =>
                    setField('lostReason', event.target.value)
                  }
                  disabled={isSaving}
                  placeholder='Record the reason for closing this enquiry.'
                />
              </FormField>
            )}
          </FormSection>

          <DialogFooter>
            <Button
              type='button'
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className={actionButtonClass}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSaving}
              className={actionButtonClass}>
              {isSaving && <Loader2Icon className='size-4 animate-spin' />}
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
