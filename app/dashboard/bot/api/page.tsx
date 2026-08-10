import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table'
import {
  TrashIcon,
  KeyRoundIcon,
  Code2Icon,
  BotIcon,
  CalendarIcon,
} from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import ApiKeyLauncher from './ApiKeyLauncher'
import CodeBlock from './CodeBlock'
import { revokeApiKey } from './action'
import { format } from 'date-fns'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

const PAGE_TITLE = 'API & Integrations'
const PAGE_DESCRIPTION =
  'Generate API keys and embed your bot into any website.'

export default async function BotApiPage() {
  const userId = await requireAuthUserId()

  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    console.error('Organization member not found!')
    return (
      <DashboardPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className='alert-danger'>
          Update your business profile to include your organization, create a bot
          and then return here to setup API.
        </div>
      </DashboardPageHeader>
    )
  }

  const bots = await prisma.bots.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  })

  if (!bots.length) {
    return (
      <DashboardPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-linear-to-b from-slate-50/80 to-white px-4 py-16'>
          <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-slate-100 text-sky-700 shadow-sm ring-1 ring-sky-200/60'>
            <BotIcon className='size-5' />
          </div>
          <div className='max-w-sm space-y-2 text-center'>
            <p className='text-sm font-semibold text-foreground'>
              No bots configured yet
            </p>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              Create a bot first, then come back here to generate API keys and
              embed code.
            </p>
          </div>
          <Button
            asChild
            className='mt-5 h-10 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 px-4 text-sm font-medium shadow-sm hover:from-slate-900 hover:to-sky-900'>
            <Link href='/dashboard/bot/interactions'>Create Bot</Link>
          </Button>
        </div>
      </DashboardPageHeader>
    )
  }

  const apiKeys = await prisma.apiKeys.findMany({
    where: { organizationId, isActive: true },
    select: { id: true, name: true, botId: true, createdAt: true },
  })

  const keys = apiKeys.map(key => {
    const bot = bots.find(bot => bot.id === key.botId)
    return {
      id: key.id,
      name: key.name,
      bot: bot?.name,
      created_at: key.createdAt,
    }
  })

  return (
    <DashboardPageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <section className='space-y-5'>
        {/* Generate key */}
        <div className='dashboard-surface relative overflow-hidden rounded-xl p-5'>
          <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-300/50 to-transparent' />
          <div className='relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex min-w-0 items-start gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
                <KeyRoundIcon className='size-4' />
              </div>
              <div className='min-w-0 space-y-1'>
                <h2 className='text-sm font-semibold tracking-tight text-foreground'>
                  API keys
                </h2>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  Create a key for a specific bot to authenticate embed widgets
                  and API requests.
                </p>
              </div>
            </div>
            <ApiKeyLauncher bots={bots} />
          </div>
        </div>

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-linear-to-b from-slate-50/80 to-white px-4 py-12 text-center'>
            <div className='mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
              <KeyRoundIcon className='size-4' />
            </div>
            <p className='text-sm font-medium text-foreground'>
              No API keys yet
            </p>
            <p className='mt-1 max-w-xs text-xs text-muted-foreground'>
              Generate your first key to start embedding a bot on your site.
            </p>
          </div>
        ) : (
          <div className='dashboard-surface overflow-hidden rounded-xl'>
            <div className='flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5'>
              <div>
                <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                  Your API keys
                </h3>
                <p className='text-xs text-muted-foreground'>
                  Active keys for this organization
                </p>
              </div>
              <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>
                {keys.length} {keys.length === 1 ? 'key' : 'keys'}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className='border-slate-100 hover:bg-transparent'>
                  <TableHead className='h-10 px-5'>Label</TableHead>
                  <TableHead className='h-10 px-5'>Bot</TableHead>
                  <TableHead className='h-10 px-5'>Created</TableHead>
                  <TableHead className='h-10 px-5 text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(apiKey => (
                  <TableRow
                    key={apiKey.id}
                    className='border-slate-100 hover:bg-slate-50/60'>
                    <TableCell className='px-5 py-3.5'>
                      <div className='flex items-center gap-2.5'>
                        <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500 ring-1 ring-slate-200/70'>
                          <KeyRoundIcon className='size-3.5' />
                        </div>
                        <span className='text-sm font-medium text-foreground'>
                          {apiKey.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='inline-flex items-center gap-1.5 text-xs font-medium text-slate-700'>
                        <BotIcon className='size-3 text-slate-400' />
                        {apiKey.bot ?? 'Unknown bot'}
                      </span>
                    </TableCell>
                    <TableCell className='px-5 py-3.5'>
                      <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <CalendarIcon className='size-3.5' />
                        {format(apiKey.created_at, 'do MMM yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className='px-5 py-3.5 text-right'>
                      <form action={revokeApiKey}>
                        <input
                          type='hidden'
                          name='api_key_id'
                          value={apiKey.id}
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type='submit'
                              variant='ghost'
                              size='icon'
                              className='size-8 rounded-md hover:bg-rose-50'>
                              <TrashIcon className='size-3.5 text-rose-500' />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side='left'>Revoke key</TooltipContent>
                        </Tooltip>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Embed code */}
        {apiKeys.length > 0 && (
          <div className='dashboard-surface overflow-hidden rounded-xl p-5'>
            <div className='mb-4 flex items-start gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-slate-700 to-sky-700 text-white shadow-sm'>
                <Code2Icon className='size-4' />
              </div>
              <div className='space-y-1'>
                <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                  Embeddable code
                </h3>
                <p className='text-xs leading-relaxed text-muted-foreground'>
                  Paste this script into your site to load the chat widget.
                </p>
              </div>
            </div>
            <div className='rounded-lg border border-slate-200/70 bg-white/70 p-3'>
              <p className='mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                Script
              </p>
              <CodeBlock />
            </div>
          </div>
        )}
      </section>
    </DashboardPageHeader>
  )
}
