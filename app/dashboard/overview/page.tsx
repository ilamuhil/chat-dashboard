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
    <main className='space-y-4'>
      <header>
        <h1 className='dashboard-title'>Overview</h1>
        <p className='text-muted-foreground mt-1 text-sm'>
          Welcome back! Here&apos;s what&apos;s happening with your bot today.
        </p>
      </header>

      <section className='space-y-4'>
        {/* Stats Cards */}
        <div className='flex flex-wrap gap-2 *:grow *:shrink-0 *:basis-3xs'>
          {stats.map(stat => (
            <Card
              key={stat.title}
              className='rounded-md shadow-xs border'>
              <CardHeader className='text-center pb-1 px-3 pt-2.5'>
                <CardTitle className='text-xs font-medium text-muted-foreground'>
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent className='text-center px-3 pb-2.5 pt-0'>
                <p className='text-xl font-semibold'>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className='text-base font-semibold mb-2'>Quick Actions</h2>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/interactions'>
                Customize Bot
              </Link>
            </Button>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/training'>
                Add Knowledge Base
              </Link>
            </Button>
            <Button variant='outline' size='default' asChild>
              <Link href='/dashboard/bot/api'>
                View API Key
              </Link>
            </Button>
          </div>
        </section>

        {/* Recent Conversations */}
        <section>
          <h2 className='text-base font-semibold mb-2'>Recent Conversations</h2>
          <Table className='bg-white'>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Snippet</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map(conversation => (
                <TableRow
                  key={conversation.id}
                  className='hover:bg-muted/50 *:text-xs'>
                  <TableCell>{conversation.user}</TableCell>
                  <TableCell className='overflow-hidden text-ellipsis max-w-[200px] text-muted-foreground text-xs italic'>
                    {conversation.snippet}
                  </TableCell>
                  <TableCell>{conversation.date}</TableCell>
                  <TableCell>
                    <Button asChild size='sm' className='bg-sky-700 text-white'>
                      <Link
                        href={`/dashboard/conversations/${conversation.id}`}
                        className='text-sm inline-flex items-center gap-1'>
                        View <EyeIcon className='size-3' />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </section>
    </main>
  )
}
