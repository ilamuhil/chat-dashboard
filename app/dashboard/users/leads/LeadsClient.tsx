'use client'

import { useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
}

export default function LeadsClient({ leads, stats }: Props) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return leads
    return leads.filter(lead => {
      const haystack = [lead.name, lead.email, lead.phone, lead.botName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [leads, searchQuery])

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

  const statCards = [
    {
      label: 'Total leads',
      value: stats.total,
      icon: UsersIcon,
      iconClass: 'bg-linear-to-br from-sky-500 to-slate-700',
    },
    {
      label: "Last week's leads",
      value: stats.lastWeek,
      icon: TrendingUpIcon,
      iconClass: 'bg-linear-to-br from-emerald-500 to-teal-700',
    },
    {
      label: "Last month's leads",
      value: stats.lastMonth,
      icon: CalendarDaysIcon,
      iconClass: 'bg-linear-to-br from-amber-500 to-orange-700',
    },
  ]

  return (
    <div className='space-y-6'>
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

          {selectedLeads.size > 0 && (
            <div className='flex items-center justify-between gap-3 rounded-lg border border-sky-200/70 bg-sky-50/70 px-3 py-2'>
              <span className='text-xs font-medium text-sky-900'>
                {selectedLeads.size} lead
                {selectedLeads.size !== 1 ? 's' : ''} selected
              </span>
              <div className='flex items-center gap-2'>
                <Select>
                  <SelectTrigger className='h-7 w-35 border-sky-200 bg-white text-xs'>
                    <SelectValue placeholder='Bulk Actions' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='export'>Export Selected</SelectItem>
                    <SelectItem value='delete'>Delete</SelectItem>
                  </SelectContent>
                </Select>
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
              {leads.length === 0 ? 'No leads yet' : 'No matching leads'}
            </p>
            <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
              {leads.length === 0
                ? 'Leads captured by your bots will appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  <TableHead className='h-10 w-12 px-5'>
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label='Select all leads on this page'
                    />
                  </TableHead>
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
                    <TableCell className='px-5 py-3.5'>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                        aria-label={`Select ${lead.name ?? 'lead'}`}
                      />
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='text-sm font-medium text-foreground'>
                        {lead.name || '—'}
                      </span>
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
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-8 rounded-md hover:bg-slate-100'>
                        <MoreVerticalIcon className='size-4 text-slate-500' />
                      </Button>
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
