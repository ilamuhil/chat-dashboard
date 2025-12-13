'use client'
import { useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import {
  SearchIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreVerticalIcon,
} from 'lucide-react'

export default function LeadsPage() {
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Mock data - replace with your actual data
  const leads = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      date: '12/08/2025 - 10:00 AM',
      status: 'new',
      source: 'website',
      score: 85,
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '1234567890',
      date: '12/08/2025 - 10:00 AM',
      status: 'contacted',
      source: 'chat-bot',
      score: 72,
    },
    {
      id: 3,
      name: 'Jim Smith',
      email: 'jim.smith@example.com',
      phone: '0987654321',
      date: '12/07/2025 - 2:30 PM',
      status: 'qualified',
      source: 'referral',
      score: 95,
    },
  ]

  // Mock stats - replace with actual calculations
  const stats = {
    total: 150,
    lastWeek: 23,
    lastMonth: 87,
  }

  const toggleLeadSelection = (leadId: number) => {
    const newSelected = new Set(selectedLeads)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeads(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)))
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
  }

  const totalPages = Math.ceil(leads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = leads.slice(startIndex, endIndex)

  return (
    <main className='min-h-dvh overflow-y-auto no-scrollbar space-y-4 p-4'>
      <header className='shrink-0'>
        <h1 className='dashboard-title'>Leads</h1>
      </header>

      <Card className='py-3 px-1 rounded shadow-none'>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <div>
              <div className='text-sm font-semibold text-muted-foreground'>
                Total Leads
              </div>
              <div className='text-xl font-bold'>{stats.total}</div>
            </div>
            <div>
              <div className='text-sm font-semibold text-muted-foreground'>
                Last Week&apos;s Leads
              </div>
              <div className='text-xl font-bold'>{stats.lastWeek}</div>
            </div>
            <div>
              <div className='text-sm font-semibold text-muted-foreground'>
                Last Month&apos;s Leads
              </div>
              <div className='text-xl font-bold'>{stats.lastMonth}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search, Filters, and Actions Bar */}
      <section className='space-y-4'>
        <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
          {/* Search Bar */}
          <div className='relative flex-1 max-w-md'>
            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4' />
            <Input
              type='text'
              placeholder='Search by name, email, or phone...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-9 pr-9'
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground'>
                <XIcon className='size-4' />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className='flex items-center gap-2'>
            <Select>
              <SelectTrigger className='w-[180px]'>
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
            <Button variant='outline' size='default'>
              Export
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedLeads.size > 0 && (
          <div className='bg-muted/50 rounded-md border px-3 py-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-medium'>
                {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''}{' '}
                selected
              </span>
              <div className='flex items-center gap-2'>
                <Select>
                  <SelectTrigger className='w-[140px] h-7 text-xs'>
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
                  className='h-7 text-xs'>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Table */}
        <div className='w-full overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-12'>
                  <Checkbox
                    checked={
                      selectedLeads.size === leads.length && leads.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Lead Captured Date</TableHead>
                <TableHead className='w-12'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='[&_td]:py-2'>
              {paginatedLeads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.has(lead.id)}
                      onCheckedChange={() => toggleLeadSelection(lead.id)}
                    />
                  </TableCell>
                  <TableCell className='font-medium'>{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>{lead.date}</TableCell>
                  <TableCell>
                    <Button variant='ghost' size='icon' className='size-8'>
                      <MoreVerticalIcon className='size-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between'>
          <div className='text-sm text-muted-foreground'>
            Showing {startIndex + 1} to {Math.min(endIndex, leads.length)} of{' '}
            {leads.length} leads
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}>
              <ChevronLeftIcon className='size-4' />
              Previous
            </Button>
            <div className='flex items-center gap-1'>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setCurrentPage(page)}
                  className='w-8 h-8 p-0'>
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() =>
                setCurrentPage(prev => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}>
              Next
              <ChevronRightIcon className='size-4' />
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
