import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table'
import { TrashIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import ApiKeyLauncher from './ApiKeyLauncher'
import CodeBlock from './CodeBlock'
import { redirect } from 'next/navigation'
import { revokeApiKey } from './action'
import { format } from 'date-fns'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export default async function BotApiPage() {
  const userId = await requireAuthUserId()

  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    console.error('Organization member not found!')
    return (
      <div className='alert-danger'>
        Update your business profile to include your organization, create a bot
        and then return here to setup API.
      </div>
    )
  }

  const bots = await prisma.bots.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  })
  if (!bots.length) {
    return (
      <main className='space-y-3'>
        <header>
          <h1 className='dashboard-title'>API & Integrations</h1>
        </header>

        <Card className='rounded-md shadow-none py-3 gap-3'>
          <CardContent className='py-0 px-4'>
            <p className='text-sm text-muted-foreground italic'>
              You do not have any bots yet. Please create a bot and then return
              here to setup API.
            </p>
            <div className='pt-2'>
              <Button
                variant='outline'
                className='text-xs px-3'
                onClick={() => redirect('/dashboard/bot/interactions')}>
                Create Bot
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }
  const apiKeys = await prisma.apiKeys.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, botId: true, createdAt: true },
  })

  const keys = apiKeys?.map(key => {
    const bot = bots?.find(bot => bot.id === key.botId)
    return {
      id: key.id,
      name: key.name,
      bot: bot?.name,
      created_at: key.createdAt,
    }
  })

  return (
    <main className='space-y-3'>
      <header>
        <h1 className='dashboard-title'>API & Integrations</h1>
      </header>

      <section className='space-y-3'>
        <h2 className='text-sm font-semibold'>SETUP API</h2>

        <Card className='rounded-md shadow-none py-3 gap-3'>
          <CardContent className='py-0 px-4'>
            <ApiKeyLauncher bots={bots ?? []} />
          </CardContent>
        </Card>

        {keys?.length === 0 && (
          <Card className='rounded-md shadow-none border-dashed py-3 gap-3'>
            <CardContent className='py-0 px-4 text-sm text-muted-foreground italic'>
              No API Keys Created
            </CardContent>
          </Card>
        )}
        {keys?.length > 0 && (
          <Card className='rounded-md shadow-none py-3 gap-3'>
            <CardHeader className='px-4 py-1.5'>
              <CardTitle className='text-sm'>Your API Keys</CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-0'>
              <Table className='bg-white'>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Bot</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map(apiKey => (
                    <TableRow key={apiKey.id}>
                      <TableCell className='font-medium'>
                        {apiKey.name}
                      </TableCell>
                      <TableCell>{apiKey.bot}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {format(apiKey.created_at, 'do MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <form action={revokeApiKey} id='revoke-api-key-form'>
                          <input
                            type='hidden'
                            name='api_key_id'
                            value={apiKey.id}
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon-sm'
                                className='bg-red-500/15 hover:bg-red-500/25 rounded-md'>
                                <TrashIcon className='size-4 text-red-500' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side='right'>Revoke</TooltipContent>
                          </Tooltip>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {apiKeys?.length > 0 && (
          <Card className='rounded-md shadow-none py-3 gap-3'>
            <CardHeader className='px-4 py-1.5'>
              <CardTitle className='text-sm'>Embeddable Code</CardTitle>
            </CardHeader>
            <CardContent className='px-4 pb-0'>
              <div className='bg-muted/20 p-2 rounded-md border'>
                <h4 className='text-xs font-semibold text-muted-foreground mb-2'>
                  Script
                </h4>
                <pre className='text-xs rounded-md border bg-white p-2 overflow-x-auto'>
                  <CodeBlock />
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}
