import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { prisma } from '@/lib/prisma'
import { isAxiosError } from 'axios'


export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = (await params) as { bot_id: string }
  if (!bot_id) {
    return NextResponse.json(
      { error: 'Invalid bot ID or botId not provided' },
      { status: 400 }
    )
  }
  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  type TrainingSource = {
    id: string
    type: 'file' | 'url'
    source_value: string
    original_filename?: string | null
    status: string | null
  }

  const trainingSourcesRaw = await prisma.trainingSources.findMany({
    where: { botId: bot_id },
    select: {
      id: true,
      type: true,
      sourceValue: true,
      originalFilename: true,
      status: true,
    },
  })
  const trainingSources = trainingSourcesRaw.map((source) => ({
    id: source.id,
    type: source.type as 'file' | 'url',
    source_value: source.sourceValue ?? '',
    original_filename: source.originalFilename ?? null,
    status: source.status,
  })) as TrainingSource[]

  const file_ids = trainingSources
    .filter((source: TrainingSource) => source.type === 'file')
    .map((source: TrainingSource) => source.id)
  const files = await prisma.files.findMany({
    where: { id: { in: file_ids } },
    select: { id: true, originalFilename: true, mimeType: true, sizeBytes: true },
  })
  const trainingSourcesWithFiles = trainingSources.map(
    (source: TrainingSource) => {
      if (source.type === 'file') {
        const file = files.find((file: { id: string }) => file.id === source.id)
        return {
          ...source,
          file: file
            ? {
                id: file.id,
                original_filename: file.originalFilename,
                mime_type: file.mimeType,
                size_bytes: file.sizeBytes ? Number(file.sizeBytes) : null,
              }
            : null,
        }
      }
      return source
    }
  )

  return NextResponse.json({ sources: trainingSourcesWithFiles })
}





/* ---------------- POST: QUEUE TRAINING ---------------- */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = await params
  if (!bot_id) {
    return NextResponse.json({ error: 'Invalid bot' }, { status: 400 })
  }


  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const { organizationId } = guard

  // Prevent concurrent training
  const active = await prisma.trainingSources.findMany({
    where: { botId: bot_id, status: { in: ['training', 'queued_for_training'] }, deletedAt: null },
    select: { id: true },
  })

  if (active && active.length > 0) {
    return NextResponse.json(
      { error: 'Training already in progress please wait for it to complete before you can retrain the bot.' },
      { status: 409 }
    )
  }

  const trainingSourceIds = await prisma.trainingSources.findMany({
    where: {
      botId: bot_id,
      organizationId: organizationId,
      deletedAt: null,
      status: "created"
    },
    select: {
      id: true,
    },
  })
 

  /* ---------- CALL PYTHON ---------- */
  const privateKey = getSecretKey()
  if (!privateKey) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  const token = signToken(
    { organization_id: organizationId, bot_id, type: 'agent' },
    privateKey,
    '5m'
  )

  try {
    await pythonApiRequest(
      'POST',
      '/api/training/queue',
      token,
      {
        bot_id,
        source_ids: trainingSourceIds,
      }
    )
  } catch (error: unknown) {
    const fallbackErrorMessage = 'Error occurred while training the bot. Please try again.'
    if (isAxiosError(error)) {
      console.error('Queueing failed', error.response?.data)
      return NextResponse.json({ error: error.response.data.error || fallbackErrorMessage}, { status: error.response?.status ?? 500 })
    } else {
      console.error('Queueing failed', error)
      return NextResponse.json({ error: fallbackErrorMessage}, { status: 500 })
    }
  }

  return NextResponse.json(
    { message: 'Training queued', total_sources: trainingSourceIds.length },
    { status: 200 }
  )
}

/* ---------------- DELETE TRAINING SOURCE ---------------- */
