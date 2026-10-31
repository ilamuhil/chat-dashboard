'use client'

import { RequirePermission } from '@/components/organization-access'
import Link from 'next/link'
import { OwnerSelect } from '@/components/leads/owner-select'
import { Badge } from '@/components/ui/badge'
import type { CounsellorOption } from '@/lib/leads/follow-ups'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  dashboardButtonClass,
  dashboardDangerButtonClass,
  dashboardOutlineButtonClass,
} from '@/lib/dashboard/dashboard-buttons'
import { cn } from '@/lib/core/utils'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SearchIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
  UsersIcon,
  CalendarDaysIcon,
  TrendingUpIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { format } from 'date-fns'

export type LeadRow = {
  assignedCounsellorId: string | null
  leadPriority: string | null
  priorityReason: string | null
  id: string
  name: string | null
  email: string | null
  phone: string | null
  capturedAt: string
  botName: string | null
}

export type LeadStats = {
  total: number
  lastWeek: number
  lastMonth: number
}

type Props = {
  userId: string
  members: CounsellorOption[]
  leads: LeadRow[]
  stats: LeadStats
  isAdmin: boolean
}

type PipelineStage =
  | 'new_enquiry'
  | 'qualified'
  | 'counselling_requested'
  | 'contacted'
  | 'application_started'
  | 'enrolled'
  | 'lost'

const pipelineStages: { value: PipelineStage; label: string }[] = [
  { value: 'new_enquiry', label: 'New enquiry' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'counselling_requested', label: 'Counselling requested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'application_started', label: 'Application started' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return data?.error || 'Something went wrong. Please try again.'
}

export default function LeadsClient({
  leads,
  stats,
  isAdmin,
  members,
  userId,
}: Props) {
  const router = useRouter()
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [courseInterest, setCourseInterest] = useState('')
  const [pipelineStage, setPipelineStage] =
    useState<PipelineStage>('new_enquiry')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [lostReason, setLostReason] = useState('')
  const [consentToContact, setConsentToContact] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState<{
    ids: string[]
    description: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [removedLeadIds, setRemovedLeadIds] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  async function exportLeads() {
    setIsExporting(true)
    try {
      const response = await fetch('/api/dashboard/leads/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: filteredLeads.map((l) => l.id) }),
      })
      if (!response.ok)
        throw new Error((await response.json()).error || 'Export failed')
      const url = URL.createObjectURL(await response.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Filtered leads exported')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not export leads',
      )
    } finally {
      setIsExporting(false)
    }
  }
  const itemsPerPage = 10

  const activeLeads = useMemo(
    () => leads.filter((lead) => !removedLeadIds.has(lead.id)),
    [leads, removedLeadIds],
  )

  const visibleStats = useMemo(() => {
    if (removedLeadIds.size === 0) return stats

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const removedLeads = leads.filter((lead) => removedLeadIds.has(lead.id))

    return {
      total: Math.max(0, stats.total - removedLeads.length),
      lastWeek: Math.max(
        0,
        stats.lastWeek -
          removedLeads.filter((lead) => new Date(lead.capturedAt) >= weekAgo)
            .length,
      ),
      lastMonth: Math.max(
        0,
        stats.lastMonth -
          removedLeads.filter((lead) => new Date(lead.capturedAt) >= monthAgo)
            .length,
      ),
    }
  }, [leads, removedLeadIds, stats])

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return activeLeads.filter((lead) => {
      if (ownerFilter === 'mine' && lead.assignedCounsellorId !== userId)
        return false
      if (ownerFilter === 'unassigned' && lead.assignedCounsellorId)
        return false
      if (
        !['all', 'mine', 'unassigned'].includes(ownerFilter) &&
        lead.assignedCounsellorId !== ownerFilter
      )
        return false
      if (priorityFilter !== 'all' && lead.leadPriority !== priorityFilter)
        return false
      const haystack = [lead.name, lead.email, lead.phone, lead.botName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [activeLeads, searchQuery, ownerFilter, priorityFilter, userId])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)

  const allVisibleSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((lead) => selectedLeads.has(lead.id))

  const toggleLeadSelection = (leadId: string) => {
    const next = new Set(selectedLeads)
    if (next.has(leadId)) next.delete(leadId)
    else next.add(leadId)
    setSelectedLeads(next)
  }

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedLeads)
      paginatedLeads.forEach((lead) => next.delete(lead.id))
      setSelectedLeads(next)
    } else {
      const next = new Set(selectedLeads)
      paginatedLeads.forEach((lead) => next.add(lead.id))
      setSelectedLeads(next)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  function resetAddForm() {
    setName('')
    setEmail('')
    setPhone('')
    setCourseInterest('')
    setPipelineStage('new_enquiry')
    setLostReason('')
    setConsentToContact(false)
  }

  async function createLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim() && !phone.trim()) {
      toast.error('Enter at least an email address or phone number')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          courseInterest: courseInterest.trim() || null,
          pipelineStage,
          lostReason:
            pipelineStage === 'lost' ? lostReason.trim() || null : null,
          consentToContact,
        }),
      })

      if (!response.ok) throw new Error(await readError(response))

      toast.success('Lead added successfully')
      resetAddForm()
      setIsCreating(false)
      setAddDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add lead')
      setIsCreating(false)
    }
  }

  function requestDelete(ids: string[], description: string) {
    setDeleteRequest({ ids, description })
    setDeleteDialogOpen(true)
  }

  async function deleteLeads() {
    if (!deleteRequest) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/dashboard/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: deleteRequest.ids }),
      })

      if (!response.ok) throw new Error(await readError(response))

      const deletedIds = new Set(deleteRequest.ids)
      setRemovedLeadIds((current) => new Set([...current, ...deletedIds]))
      setSelectedLeads((current) => {
        const next = new Set(current)
        deletedIds.forEach((id) => next.delete(id))
        return next
      })
      toast.success(
        deleteRequest.ids.length === 1
          ? 'Lead deleted successfully'
          : `${deleteRequest.ids.length} leads deleted successfully`,
      )
      setDeleteDialogOpen(false)
      setDeleteRequest(null)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not delete leads',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const statCards = [
    {
      label: 'Total leads',
      value: visibleStats.total,
      icon: UsersIcon,
      iconClass: 'bg-linear-to-br from-sky-500 to-slate-700',
    },
    {
      label: "Last week's leads",
      value: visibleStats.lastWeek,
      icon: TrendingUpIcon,
      iconClass: 'bg-linear-to-br from-emerald-500 to-teal-700',
    },
    {
      label: "Last month's leads",
      value: visibleStats.lastMonth,
      icon: CalendarDaysIcon,
      iconClass: 'bg-linear-to-br from-amber-500 to-orange-700',
    },
  ]

  return (
    <div className='space-y-6'>
      <div className='flex justify-end'>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            if (!isCreating) setAddDialogOpen(open)
          }}>
          <DialogTrigger asChild>
            <RequirePermission permission='operate'>
              <Button
                className={cn(
                  dashboardButtonClass,
                  'h-9 rounded-lg px-3 text-xs',
                )}>
                <PlusIcon className='mr-1.5 size-4' />
                Add lead
              </Button>
            </RequirePermission>
          </DialogTrigger>
          <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-xl'>
            <DialogHeader>
              <DialogTitle>Add a lead</DialogTitle>
              <DialogDescription>
                Add a prospective student and the best way to contact them.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createLead} className='space-y-5'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='space-y-1.5 sm:col-span-2'>
                  <Label htmlFor='lead-name' className='text-xs'>
                    Name <span className='text-rose-500'>*</span>
                  </Label>
                  <Input
                    id='lead-name'
                    required
                    maxLength={200}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder='Avery Johnson'
                    disabled={isCreating}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='lead-email' className='text-xs'>
                    Email
                  </Label>
                  <Input
                    id='lead-email'
                    type='email'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder='avery@example.com'
                    disabled={isCreating}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label htmlFor='lead-phone' className='text-xs'>
                    Phone
                  </Label>
                  <Input
                    id='lead-phone'
                    type='tel'
                    maxLength={50}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder='+1 555 012 3456'
                    disabled={isCreating}
                    className='text-sm'
                  />
                </div>
                <p className='-mt-2 text-[11px] text-muted-foreground sm:col-span-2'>
                  At least one email address or phone number is required.
                </p>
                <div className='space-y-1.5 sm:col-span-2'>
                  <Label htmlFor='lead-course' className='text-xs'>
                    Course interest
                  </Label>
                  <Input
                    id='lead-course'
                    maxLength={300}
                    value={courseInterest}
                    onChange={(event) => setCourseInterest(event.target.value)}
                    placeholder='e.g. Data Science'
                    disabled={isCreating}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Pipeline stage</Label>
                  <Select
                    value={pipelineStage}
                    onValueChange={(value) =>
                      setPipelineStage(value as PipelineStage)
                    }
                    disabled={isCreating}>
                    <SelectTrigger className='w-full text-sm'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className='self-center text-xs text-muted-foreground'>
                  Priority is calculated automatically from accepted facts.
                </p>
                {pipelineStage === 'lost' && (
                  <div className='space-y-2 sm:col-span-2'>
                    <Label htmlFor='new-lost-reason'>
                      Why was this lead lost?
                    </Label>
                    <Textarea
                      id='new-lost-reason'
                      required
                      maxLength={2000}
                      value={lostReason}
                      onChange={(event) => setLostReason(event.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                )}
                <div className='flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800'>
                  <div className='space-y-0.5'>
                    <Label htmlFor='lead-consent' className='text-xs'>
                      Consent to contact
                    </Label>
                    <p className='text-[11px] text-muted-foreground'>
                      The lead has agreed to receive follow-up communication.
                    </p>
                  </div>
                  <Switch
                    id='lead-consent'
                    checked={consentToContact}
                    onCheckedChange={setConsentToContact}
                    disabled={isCreating}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setAddDialogOpen(false)}
                  disabled={isCreating}>
                  Cancel
                </Button>
                <RequirePermission permission='operate'>
                  <Button
                    type='submit'
                    disabled={isCreating}
                    className={dashboardButtonClass}>
                    {isCreating && (
                      <Loader2Icon className='mr-2 size-4 animate-spin' />
                    )}
                    {isCreating ? 'Adding lead…' : 'Add lead'}
                  </Button>
                </RequirePermission>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        setOpen={setDeleteDialogOpen}
        title={
          deleteRequest?.ids.length === 1 ? 'Delete lead?' : 'Delete leads?'
        }
        description={
          deleteRequest?.description ??
          'The selected leads will be removed from the active lead list.'
        }
        confirmLabel='Delete'
        pendingLabel='Deleting…'
        isPending={isDeleting}
        keepOpenUntilComplete
        confirmClassName='bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
        onConfirm={deleteLeads}
      />

      <section className='grid grid-cols-3 gap-2 sm:gap-3'>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className='dashboard-surface relative overflow-hidden rounded-xl p-3 sm:p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='space-y-1'>
                <p className='text-xs font-medium text-muted-foreground'>
                  {stat.label}
                </p>
                <p className='text-2xl font-semibold tracking-tight tabular-nums text-foreground'>
                  {stat.value}
                </p>
              </div>
              <div
                className={`hidden size-9 items-center justify-center rounded-lg text-white shadow-sm sm:flex ${stat.iconClass}`}>
                <stat.icon className='size-4' />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div
        className='flex flex-wrap items-center gap-2'
        aria-label='Lead ownership queues'>
        {[
          ['all', 'All leads'],
          ['mine', 'My leads'],
          ['unassigned', 'Unassigned'],
        ].map(([value, label]) => (
          <Button
            key={value}
            size='sm'
            variant={ownerFilter === value ? 'secondary' : 'outline'}
            aria-pressed={ownerFilter === value}
            onClick={() => {
              setOwnerFilter(value)
              setCurrentPage(1)
              setSelectedLeads(new Set())
            }}>
            {label}
            <span className='ml-1 text-xs text-muted-foreground'>
              {
                activeLeads.filter(
                  (lead) =>
                    value === 'all' ||
                    (value === 'mine'
                      ? lead.assignedCounsellorId === userId
                      : !lead.assignedCounsellorId),
                ).length
              }
            </span>
          </Button>
        ))}
        <Select
          value={ownerFilter}
          onValueChange={(value) => {
            setOwnerFilter(value)
            setCurrentPage(1)
            setSelectedLeads(new Set())
          }}>
          <SelectTrigger
            aria-label='Filter leads by counsellor'
            className='w-full sm:w-52'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All counsellors</SelectItem>
            <SelectItem value='mine'>My leads</SelectItem>
            <SelectItem value='unassigned'>Unassigned</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.name || member.email || 'Organization member'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(value) => {
            setPriorityFilter(value)
            setCurrentPage(1)
            setSelectedLeads(new Set())
          }}>
          <SelectTrigger
            aria-label='Filter lead priority'
            className='w-full sm:w-40'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All priorities</SelectItem>
            {['hot', 'warm', 'cold'].map((value) => (
              <SelectItem key={value} value={value}>
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant='ghost' size='sm'>
          <Link href='/dashboard/users/follow-ups'>Open follow-ups</Link>
        </Button>
      </div>
      <section className='dashboard-surface overflow-hidden rounded-xl'>
        <div className='space-y-4 border-b border-slate-100 px-5 py-3.5'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative w-full max-w-md'>
              <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Search by name, email, or phone…'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className='h-9 border-slate-200 pr-9 pl-9 text-sm'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={clearSearch}
                  className='absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground'>
                  <XIcon className='size-4' />
                </button>
              )}
            </div>

            <div className='flex items-center gap-2'>
              {isAdmin && (
                <Button
                  variant='outline'
                  disabled={isExporting || filteredLeads.length === 0}
                  onClick={exportLeads}
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-9 rounded-lg px-3 text-xs',
                  )}>
                  {isExporting ? 'Exporting…' : 'Export CSV'}
                </Button>
              )}
            </div>
          </div>

          {isAdmin && selectedLeads.size > 0 && (
            <div className='flex items-center justify-between gap-3 rounded-lg border border-sky-200/70 bg-sky-50/70 px-3 py-2'>
              <span className='text-xs font-medium text-sky-900'>
                {selectedLeads.size} lead
                {selectedLeads.size !== 1 ? 's' : ''} selected
              </span>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    requestDelete(
                      [...selectedLeads],
                      `This will remove ${selectedLeads.size} selected ${
                        selectedLeads.size === 1 ? 'lead' : 'leads'
                      } from the active lead list.`,
                    )
                  }
                  className={cn(dashboardDangerButtonClass, 'h-7 text-xs')}>
                  <Trash2Icon className='mr-1.5 size-3.5' />
                  Delete selected
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setSelectedLeads(new Set())}
                  className='h-7 text-xs text-sky-800 hover:bg-sky-100 hover:text-sky-900 dark:text-sky-200 dark:hover:bg-sky-500/15 dark:hover:text-sky-100'>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <div className='flex flex-col items-center justify-center px-4 py-16 text-center'>
            <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
              <UsersIcon className='size-4' />
            </div>
            <p className='text-sm font-medium text-foreground'>
              {activeLeads.length === 0 ? 'No leads yet' : 'No matching leads'}
            </p>
            <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
              {activeLeads.length === 0
                ? 'Leads captured by your bots or added manually will appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <>
            <div className='divide-y divide-border md:hidden'>
              {paginatedLeads.map((lead) => (
                <article key={lead.id} className='space-y-3 p-4'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex min-w-0 items-start gap-2'>
                      {isAdmin && (
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          aria-label={`Select ${lead.name || 'lead'}`}
                          className='mt-1'
                        />
                      )}
                      <div className='min-w-0'>
                        <Link
                          href={`/dashboard/users/leads/${lead.id}`}
                          className='text-sm font-semibold text-primary hover:underline'>
                          {lead.name || 'Unnamed lead'}
                        </Link>
                        <p className='mt-1 break-all text-xs text-muted-foreground'>
                          {lead.email || lead.phone || 'No contact details'}
                        </p>
                        {lead.email && lead.phone && (
                          <p className='mt-1 text-xs text-muted-foreground'>
                            {lead.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      title={lead.priorityReason || ''}
                      className='capitalize'>
                      {lead.leadPriority || 'Not scored'}
                    </Badge>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <OwnerSelect
                      leadId={lead.id}
                      leadName={lead.name || 'lead'}
                      ownerId={lead.assignedCounsellorId}
                      members={members}
                    />
                    {isAdmin && (
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={`Delete ${lead.name || 'lead'}`}
                        onClick={() =>
                          requestDelete(
                            [lead.id],
                            'This lead will be removed from the active lead list.',
                          )
                        }>
                        <Trash2Icon className='size-4' />
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <Table className='hidden table-fixed md:table'>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  {isAdmin && (
                    <TableHead className='h-10 w-10 px-3'>
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label='Select all leads on this page'
                      />
                    </TableHead>
                  )}
                  <TableHead className='h-10 px-3'>Lead</TableHead>
                  <TableHead className='h-10 w-20 px-2'>Priority</TableHead>
                  <TableHead className='h-10 w-44 px-2'>Counsellor</TableHead>
                  <TableHead className='hidden h-10 w-40 px-3 xl:table-cell'>
                    Captured
                  </TableHead>
                  <TableHead className='h-10 w-10 px-1' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className='border-slate-100 hover:bg-slate-50/60'>
                    {isAdmin && (
                      <TableCell className='px-3 py-3.5'>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          aria-label={`Select ${lead.name ?? 'lead'}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className='px-3 py-3.5'>
                      <Link
                        href={`/dashboard/users/leads/${lead.id}`}
                        className='inline-flex max-w-full items-center gap-1 text-sm font-semibold text-primary hover:underline'>
                        <span className='truncate'>
                          {lead.name || 'Unnamed lead'}
                        </span>
                        <ExternalLinkIcon className='size-3 shrink-0' />
                      </Link>
                      <p
                        className='mt-1 truncate text-xs text-muted-foreground'
                        title={lead.email || lead.phone || ''}>
                        {lead.email || lead.phone || 'No contact details'}
                      </p>
                      {lead.email && lead.phone && (
                        <p className='mt-1 text-xs text-muted-foreground'>
                          {lead.phone}
                        </p>
                      )}
                      <p className='mt-1 truncate text-[10px] text-muted-foreground'>
                        {lead.botName || 'Added manually'}
                        <span className='xl:hidden'>
                          {' '}
                          · {format(new Date(lead.capturedAt), 'dd MMM yyyy')}
                        </span>
                      </p>
                    </TableCell>
                    <TableCell className='px-2 py-3.5'>
                      <Badge
                        variant='outline'
                        title={
                          lead.priorityReason ||
                          'Priority calculated from accepted facts'
                        }
                        className={
                          lead.leadPriority === 'hot'
                            ? 'border-rose-300 text-rose-700 dark:border-rose-900 dark:text-rose-300'
                            : lead.leadPriority === 'warm'
                              ? 'border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-300'
                              : 'text-muted-foreground'
                        }>
                        {lead.leadPriority
                          ? lead.leadPriority.charAt(0).toUpperCase() +
                            lead.leadPriority.slice(1)
                          : 'Not scored'}
                      </Badge>
                    </TableCell>
                    <TableCell className='px-2 py-3.5'>
                      <OwnerSelect
                        leadId={lead.id}
                        leadName={lead.name || 'lead'}
                        ownerId={lead.assignedCounsellorId}
                        members={members}
                      />
                    </TableCell>
                    <TableCell className='hidden px-3 py-3.5 xl:table-cell'>
                      <span className='text-xs text-muted-foreground'>
                        {format(
                          new Date(lead.capturedAt),
                          'dd MMM yyyy · h:mm a',
                        )}
                      </span>
                    </TableCell>
                    <TableCell className='px-1 py-3.5'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`Actions for ${lead.name || 'lead'}`}
                            className='size-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800'>
                            <MoreVerticalIcon className='size-4 text-slate-500' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-40'>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/users/leads/${lead.id}`}>
                              <ExternalLinkIcon />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant='destructive'
                                onSelect={() =>
                                  requestDelete(
                                    [lead.id],
                                    `This will remove ${
                                      lead.name || 'this lead'
                                    } from the active lead list.`,
                                  )
                                }>
                                <Trash2Icon />
                                Delete lead
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className='flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
              <p className='text-xs text-muted-foreground'>
                Showing{' '}
                <span className='font-medium text-foreground'>
                  {filteredLeads.length === 0 ? 0 : startIndex + 1}
                </span>{' '}
                to{' '}
                <span className='font-medium text-foreground'>
                  {Math.min(endIndex, filteredLeads.length)}
                </span>{' '}
                of{' '}
                <span className='font-medium text-foreground'>
                  {filteredLeads.length}
                </span>{' '}
                leads
              </p>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-8 rounded-lg text-xs',
                  )}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={safePage === 1}>
                  <ChevronLeftIcon className='size-4' />
                  Previous
                </Button>
                <div className='flex items-center gap-1'>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, safePage - 3),
                      Math.max(0, safePage - 3) + 5,
                    )
                    .map((page) => (
                      <Button
                        key={page}
                        variant={safePage === page ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          'size-8 rounded-lg p-0 text-xs',
                          safePage === page
                            ? dashboardButtonClass
                            : dashboardOutlineButtonClass,
                        )}>
                        {page}
                      </Button>
                    ))}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className={cn(
                    dashboardOutlineButtonClass,
                    'h-8 rounded-lg text-xs',
                  )}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={safePage === totalPages}>
                  Next
                  <ChevronRightIcon className='size-4' />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
