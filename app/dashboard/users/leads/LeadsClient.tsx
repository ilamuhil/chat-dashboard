'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { Input } from '@/components/ui/input'
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
  MailIcon,
  PhoneIcon,
  BotIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { format } from 'date-fns'

export type LeadRow = {
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

type LeadPriority = 'hot' | 'warm' | 'cold'

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
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | null
  return data?.error || 'Something went wrong. Please try again.'
}

export default function LeadsClient({ leads, stats, isAdmin }: Props) {
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
  const [leadPriority, setLeadPriority] = useState<LeadPriority | 'none'>(
    'none',
  )
  const [consentToContact, setConsentToContact] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteRequest, setDeleteRequest] = useState<{
    ids: string[]
    description: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [removedLeadIds, setRemovedLeadIds] = useState<Set<string>>(new Set())
  const itemsPerPage = 10

  const activeLeads = useMemo(
    () => leads.filter(lead => !removedLeadIds.has(lead.id)),
    [leads, removedLeadIds],
  )

  const visibleStats = useMemo(() => {
    if (removedLeadIds.size === 0) return stats

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    const removedLeads = leads.filter(lead => removedLeadIds.has(lead.id))

    return {
      total: Math.max(0, stats.total - removedLeads.length),
      lastWeek: Math.max(
        0,
        stats.lastWeek -
          removedLeads.filter(lead => new Date(lead.capturedAt) >= weekAgo)
            .length,
      ),
      lastMonth: Math.max(
        0,
        stats.lastMonth -
          removedLeads.filter(lead => new Date(lead.capturedAt) >= monthAgo)
            .length,
      ),
    }
  }, [leads, removedLeadIds, stats])

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return activeLeads
    return activeLeads.filter(lead => {
      const haystack = [lead.name, lead.email, lead.phone, lead.botName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [activeLeads, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)

  const allVisibleSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every(lead => selectedLeads.has(lead.id))

  const toggleLeadSelection = (leadId: string) => {
    const next = new Set(selectedLeads)
    if (next.has(leadId)) next.delete(leadId)
    else next.add(leadId)
    setSelectedLeads(next)
  }

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selectedLeads)
      paginatedLeads.forEach(lead => next.delete(lead.id))
      setSelectedLeads(next)
    } else {
      const next = new Set(selectedLeads)
      paginatedLeads.forEach(lead => next.add(lead.id))
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
    setLeadPriority('none')
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
          leadPriority: leadPriority === 'none' ? null : leadPriority,
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
      setRemovedLeadIds(current => new Set([...current, ...deletedIds]))
      setSelectedLeads(current => {
        const next = new Set(current)
        deletedIds.forEach(id => next.delete(id))
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
          onOpenChange={open => {
            if (!isCreating) setAddDialogOpen(open)
          }}>
          <DialogTrigger asChild>
            <Button className='h-9 rounded-lg bg-sky-700 px-3 text-xs hover:bg-sky-800'>
              <PlusIcon className='mr-1.5 size-4' />
              Add lead
            </Button>
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
                    onChange={event => setName(event.target.value)}
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
                    onChange={event => setEmail(event.target.value)}
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
                    onChange={event => setPhone(event.target.value)}
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
                    onChange={event => setCourseInterest(event.target.value)}
                    placeholder='e.g. Data Science'
                    disabled={isCreating}
                    className='text-sm'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Pipeline stage</Label>
                  <Select
                    value={pipelineStage}
                    onValueChange={value =>
                      setPipelineStage(value as PipelineStage)
                    }
                    disabled={isCreating}>
                    <SelectTrigger className='w-full text-sm'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelineStages.map(stage => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Priority</Label>
                  <Select
                    value={leadPriority}
                    onValueChange={value =>
                      setLeadPriority(value as LeadPriority | 'none')
                    }
                    disabled={isCreating}>
                    <SelectTrigger className='w-full text-sm'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>Not set</SelectItem>
                      <SelectItem value='hot'>Hot</SelectItem>
                      <SelectItem value='warm'>Warm</SelectItem>
                      <SelectItem value='cold'>Cold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 sm:col-span-2'>
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
                <Button
                  type='submit'
                  disabled={isCreating}
                  className='bg-sky-700 hover:bg-sky-800'>
                  {isCreating && (
                    <Loader2Icon className='mr-2 size-4 animate-spin' />
                  )}
                  {isCreating ? 'Adding lead…' : 'Add lead'}
                </Button>
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

      <section className='grid grid-cols-1 gap-3 md:grid-cols-3'>
        {statCards.map(stat => (
          <div
            key={stat.label}
            className='dashboard-surface relative overflow-hidden rounded-xl p-4'>
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
                className={`flex size-9 items-center justify-center rounded-lg text-white shadow-sm ${stat.iconClass}`}>
                <stat.icon className='size-4' />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className='dashboard-surface overflow-hidden rounded-xl'>
        <div className='space-y-4 border-b border-slate-100 px-5 py-3.5'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='relative w-full max-w-md'>
              <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                type='text'
                placeholder='Search by name, email, or phone…'
                value={searchQuery}
                onChange={e => {
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
              <Select>
                <SelectTrigger className='h-9 w-40 border-slate-200 text-xs'>
                  <SelectValue placeholder='Export format' />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Export Format</SelectLabel>
                    <SelectItem value='csv'>CSV</SelectItem>
                    <SelectItem value='excel'>Excel</SelectItem>
                    <SelectItem value='pdf'>PDF</SelectItem>
                    <SelectItem value='json'>JSON</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                className='h-9 rounded-lg border-slate-200 px-3 text-xs'>
                Export
              </Button>
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
                  className='h-7 border-rose-200 bg-white text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700'>
                  <Trash2Icon className='mr-1.5 size-3.5' />
                  Delete selected
                </Button>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setSelectedLeads(new Set())}
                  className='h-7 text-xs text-sky-800 hover:bg-sky-100 hover:text-sky-900'>
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
            <Table>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  {isAdmin && (
                    <TableHead className='h-10 w-12 px-5'>
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label='Select all leads on this page'
                      />
                    </TableHead>
                  )}
                  <TableHead className='h-10 px-5'>Name</TableHead>
                  <TableHead className='h-10 px-5'>Email</TableHead>
                  <TableHead className='h-10 px-5'>Phone</TableHead>
                  <TableHead className='h-10 px-5'>Bot</TableHead>
                  <TableHead className='h-10 px-5'>Captured</TableHead>
                  <TableHead className='h-10 w-12 px-5' />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map(lead => (
                  <TableRow
                    key={lead.id}
                    className='border-slate-100 hover:bg-slate-50/60'>
                    {isAdmin && (
                      <TableCell className='px-5 py-3.5'>
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                          aria-label={`Select ${lead.name ?? 'lead'}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className='px-5 py-3.5'>
                      <Link
                        href={`/dashboard/users/leads/${lead.id}`}
                        className='group/link inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-slate-800 underline-offset-4 transition-colors hover:text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50'>
                        {lead.name || '—'}
                        <ExternalLinkIcon className='size-3 text-slate-300 transition-colors group-hover/link:text-sky-500' />
                      </Link>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <MailIcon className='size-3.5 shrink-0 text-slate-400' />
                        {lead.email || '—'}
                      </span>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <PhoneIcon className='size-3.5 shrink-0 text-slate-400' />
                        {lead.phone || '—'}
                      </span>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      {lead.botName ? (
                        <span className='inline-flex items-center gap-1.5 text-xs font-medium text-slate-700'>
                          <BotIcon className='size-3 text-slate-400' />
                          {lead.botName}
                        </span>
                      ) : (
                        <span className='text-xs text-muted-foreground'>—</span>
                      )}
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='text-xs text-muted-foreground'>
                        {format(
                          new Date(lead.capturedAt),
                          'dd MMM yyyy · h:mm a'
                        )}
                      </span>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`Actions for ${lead.name || 'lead'}`}
                            className='size-8 rounded-md hover:bg-slate-100'>
                            <MoreVerticalIcon className='size-4 text-slate-500' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-40'>
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/dashboard/users/leads/${lead.id}`}>
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
                  className='h-8 rounded-lg border-slate-200 text-xs'
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safePage === 1}>
                  <ChevronLeftIcon className='size-4' />
                  Previous
                </Button>
                <div className='flex items-center gap-1'>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(
                      Math.max(0, safePage - 3),
                      Math.max(0, safePage - 3) + 5
                    )
                    .map(page => (
                      <Button
                        key={page}
                        variant={safePage === page ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setCurrentPage(page)}
                        className='size-8 rounded-lg p-0 text-xs'>
                        {page}
                      </Button>
                    ))}
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 rounded-lg border-slate-200 text-xs'
                  onClick={() =>
                    setCurrentPage(prev => Math.min(totalPages, prev + 1))
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
