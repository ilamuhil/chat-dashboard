import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EyeIcon } from 'lucide-react'
import Link from 'next/link'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

export default function OverviewPage() {
  const stats = [
    {
      title: 'Total Conversations',
      value: '1,238',
    },
    {
      title: 'Leads Collected',
      value: '312',
    },
    {
      title: 'Bot Accuracy',
      value: '87%',
    },
  ]

  const conversations = Array.from({ length: 5 }).map((_, index) => ({
    id: index + 1,
    user: 'John Doe',
    snippet:
      'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
    date: '12/08/2025',
  }))

  return (
    <DashboardPageHeader
      title='Overview'
      description="Welcome back! Here's what is happening with your bot today.">
      <section className='space-y-4'>
        {/* Stats Cards */}
        <div className='flex flex-wrap gap-2 *:grow *:shrink-0 *:basis-3xs'>
          {stats.map(stat => (
            <Card
              key={stat.title}
              className='rounded-md border shadow-xs'>
              <CardHeader className='px-3 pt-2.5 pb-1 text-center'>
                <CardTitle className='text-xs font-medium text-muted-foreground'>
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent className='px-3 pt-0 pb-2.5 text-center'>
                <p className='text-xl font-semibold'>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className='mb-2 text-base font-semibold'>Quick Actions</h2>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/interactions'>Customize Bot</Link>
            </Button>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/training'>Add Knowledge Base</Link>
            </Button>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/api'>View API Key</Link>
            </Button>
          </div>
        </section>

        {/* Recent Conversations */}
        <section>
          <h2 className='mb-2 text-base font-semibold'>Recent Conversations</h2>
          <div className='dashboard-surface overflow-hidden rounded-xl'>
            <Table>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  <TableHead className='px-5'>User</TableHead>
                  <TableHead className='px-5'>Snippet</TableHead>
                  <TableHead className='px-5'>Date</TableHead>
                  <TableHead className='px-5'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map(conversation => (
                  <TableRow
                    key={conversation.id}
                    className='border-slate-100 hover:bg-slate-50/60 *:text-xs'>
                    <TableCell className='px-5 py-3'>{conversation.user}</TableCell>
                    <TableCell className='max-w-50 overflow-hidden px-5 py-3 text-xs text-ellipsis text-muted-foreground italic'>
                      {conversation.snippet}
                    </TableCell>
                    <TableCell className='px-5 py-3'>{conversation.date}</TableCell>
                    <TableCell className='px-5 py-3'>
                      <Button asChild size='sm' className='bg-sky-700 text-white'>
                        <Link
                          href={`/dashboard/conversations/${conversation.id}`}
                          className='inline-flex items-center gap-1 text-sm'>
                          View <EyeIcon className='size-3' />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </section>
    </DashboardPageHeader>
  )
}
