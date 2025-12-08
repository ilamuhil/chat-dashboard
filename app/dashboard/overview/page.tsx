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
    <div className='space-y-6'>
      <header>
        <h1 className='dashboard-title'>Overview</h1>
        <p className='text-muted-foreground mt-2'>
          Welcome back! Here&apos;s what&apos;s happening with your bot today.
        </p>
      </header>

      <section className='space-y-6'>
        {/* Stats Cards */}
        <div className='flex flex-wrap gap-3 *:grow *:shrink-0 *:basis-3xs'>
          {stats.map(stat => (
            <Card
              key={stat.title}
              className='transition-shadow hover:shadow-md gap-2'>
              <CardHeader className='text-center text-nowrap'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent className='text-center'>
                <div className='text-2xl font-bold'>{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className='text-lg font-semibold mb-4'>Quick Actions</h2>
          <div className='flex flex-wrap gap-3'>
            <Button variant='outline' size='default'>
              Customize Bot
            </Button>
            <Button variant='outline' size='default'>
              Add Knowledge Base
            </Button>
            <Button variant='outline' size='default'>
              View API Key
            </Button>
          </div>
        </section>

        {/* Recent Conversations */}
        <section>
          <h2 className='text-lg font-semibold my-4'>Recent Conversations</h2>
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
    </div>
  )
}
