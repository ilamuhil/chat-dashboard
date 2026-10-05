import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { queueError, trainingErrors, type TrainingError } from '@/lib/training-errors'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ bot_id: string }> }) {
  const { bot_id } = await params
  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const sources = await prisma.trainingSources.findMany({
    where: { botId: bot_id, organizationId: guard.organizationId, deletedAt: null },
    select: { id: true, type: true, sourceValue: true, originalFilename: true, status: true, errorMessage: true },
  })
  return NextResponse.json({ sources: sources.map(source => ({
    id: source.id, type: source.type, source_value: source.sourceValue ?? '',
    original_filename: source.originalFilename, status: source.status,
    errors: trainingErrors(source.errorMessage), retry_available: source.status === 'training_failed',
  })) })
}

const queueRequest = z.object({
  source_ids: z.array(z.string().uuid()).min(1).optional(),
  retry_failed: z.boolean().default(false),
})

async function saveQueueErrors(botId: string, organizationId: string, sourceIds: string[], errors: TrainingError[]) {
  await prisma.$transaction(async tx => {
    // Lock the rows before reading and appending the JSON history.
    await tx.$queryRaw(Prisma.sql`SELECT id FROM public.training_sources
      WHERE id IN (${Prisma.join(sourceIds.map(id => Prisma.sql`${id}::uuid`))})
      AND bot_id = ${botId}::uuid AND organization_id = ${organizationId}
      AND deleted_at IS NULL FOR UPDATE`)
    const sources = await tx.trainingSources.findMany({ where: {
      id: { in: sourceIds }, botId, organizationId, deletedAt: null,
      status: { in: ['created', 'training_failed'] },
    } })
    for (const source of sources) {
      const history = trainingErrors(source.errorMessage)
      const incoming = errors.length ? errors.map(error => ({ ...error, source_id: source.id })) : [queueError(source.id)]
      const existing = new Set(history.map(error => error.id))
      await tx.trainingSources.update({ where: { id: source.id }, data: {
        status: 'training_failed', errorMessage: [...history, ...incoming.filter(error => !existing.has(error.id))],
      } })
    }
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ bot_id: string }> }) {
  const { bot_id } = await params
  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const parsed = queueRequest.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one valid training source.' }, { status: 400 })
  const { source_ids, retry_failed } = parsed.data
  const active = await prisma.trainingSources.count({ where: {
    botId: bot_id, organizationId: guard.organizationId, deletedAt: null,
    status: { in: ['training', 'queued_for_training'] },
  } })
  if (active) return NextResponse.json({ error: 'Training is already in progress. Wait for it to finish before retrying.' }, { status: 409 })
  const sources = await prisma.trainingSources.findMany({ where: {
    botId: bot_id, organizationId: guard.organizationId, deletedAt: null,
    status: { in: retry_failed ? ['training_failed'] : ['created', 'training_failed'] },
    ...(source_ids ? { id: { in: source_ids } } : {}),
  }, select: { id: true } })
  const ids = sources.map(source => source.id)
  if (source_ids && new Set(ids).size !== new Set(source_ids).size) return NextResponse.json({ error: 'Some sources are unavailable or are not eligible for training.' }, { status: 400 })
  if (!ids.length) return NextResponse.json({ message: 'No eligible sources to train', total_sources: 0 })
  try {
    const privateKey = getSecretKey()
    if (!privateKey) throw new Error('Training service signing key is missing')
    const token = signToken({ organization_id: guard.organizationId, bot_id, type: 'support_agent' }, privateKey, '5m')
    const response = await pythonApiRequest<{ message: string; job_id?: string; source_ids?: string[] }>('POST', '/api/training/queue', token, { bot_id, source_ids: ids, retry_failed })
    return NextResponse.json({ ...response, total_sources: ids.length })
  } catch (error: unknown) {
    console.error('Training queue failed', { type: error instanceof Error ? error.name : typeof error, status: isAxiosError(error) ? error.response?.status : undefined })
    const upstream = isAxiosError(error) ? error.response?.data : undefined
    const errors = trainingErrors(upstream?.errors)
    const status = isAxiosError(error) ? error.response?.status ?? 503 : 503
    // Do not alter a successfully dispatched worker's queued/training sources on a response timeout.
    if (status !== 409 || errors.length) {
      try { await saveQueueErrors(bot_id, guard.organizationId, ids, errors) }
      catch (saveError) { console.error('Could not save training queue errors', saveError) }
    }
    const message = errors[0]?.message ?? (status === 409 ? 'Training is already in progress. Wait for it to finish.' : 'Training could not be queued. Please retry.')
    return NextResponse.json({ error: message, errors, retry_available: status !== 409 || !!errors.length }, { status })
  }
}
