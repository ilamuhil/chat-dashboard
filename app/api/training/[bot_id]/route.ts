import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { prisma } from '@/lib/prisma'
import { uploadFile, deleteFile } from '@/lib/filemanagement'


export const runtime = 'nodejs'
const BUCKET = 'bot-files'

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

  const formData = await request.formData()
  const sourcesRaw = formData.get('sources')
  const filesMetaRaw = formData.get('files_meta')

  if (typeof sourcesRaw !== 'string') {
    return NextResponse.json({ error: 'Invalid sources' }, { status: 400 })
  }

  const sources = JSON.parse(sourcesRaw) as Array<{
    type: 'url' | 'file'
    value?: string
  }>
  if (!sources.length) {
    return NextResponse.json({ error: 'No sources provided' }, { status: 400 })
  }

  const files = formData.getAll('files') as File[]
  const filesMeta =
    typeof filesMetaRaw === 'string' ? JSON.parse(filesMetaRaw) : []

  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const { organizationId } = guard

  // Prevent concurrent training
  const active = await prisma.trainingSources.findMany({
    where: { botId: bot_id, status: { in: ['pending', 'processing'] } },
    select: { id: true },
  })

  if (active && active.length > 0) {
    return NextResponse.json(
      { error: 'Training already in progress' },
      { status: 409 }
    )
  }

  const trainingSourceIds: string[] = []
  const uploadedPaths: string[] = []

  /* ---------- FILE SOURCES ---------- */
  if (files.length > 0) {
    if (files.length !== filesMeta.length) {
      return NextResponse.json(
        { error: 'File metadata mismatch' },
        { status: 400 }
      )
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const meta = filesMeta[i]
      const path = `organizations/${organizationId}/bots/${bot_id}/${crypto.randomUUID()}-${
        meta.original_filename
      }`

      try {
        await uploadFile(file, path, BUCKET)
      } catch {
        await Promise.all(uploadedPaths.map((p) => deleteFile(BUCKET, p).catch(() => null)))
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
      }

      uploadedPaths.push(path)

      let fileRowId: string
      try {
        const fileRow = await prisma.files.create({
          data: {
            organizationId,
            botId: bot_id,
            bucket: BUCKET,
            path,
            originalFilename: meta.original_filename,
            mimeType: meta.mime_type,
            sizeBytes: BigInt(meta.size_bytes ?? file.size),
            purpose: 'training',
            status: 'uploaded',
            provider: 'r2',
          },
          select: { id: true },
        })
        fileRowId = fileRow.id
      } catch {
        await Promise.all(uploadedPaths.map((p) => deleteFile(BUCKET, p).catch(() => null)))
        return NextResponse.json(
          { error: 'Failed to create file record' },
          { status: 500 }
        )
      }

      try {
        const source = await prisma.trainingSources.create({
          data: {
            organizationId,
            botId: bot_id,
            type: 'file',
            sourceValue: fileRowId,
            status: 'pending',
          },
          select: { id: true },
        })
        trainingSourceIds.push(source.id)
      } catch {
        await Promise.all(uploadedPaths.map((p) => deleteFile(BUCKET, p).catch(() => null)))
        return NextResponse.json(
          { error: 'Failed to create training source for file' },
          { status: 500 }
        )
      }
    }
  }

  /* ---------- URL SOURCES ---------- */
  const uniqueUrls = [
    ...new Set(sources.filter(s => s.type === 'url').map(s => s.value!)),
  ]

  for (const url of uniqueUrls) {
    try {
      const source = await prisma.trainingSources.create({
        data: {
          organizationId,
          botId: bot_id,
          type: 'url',
          sourceValue: url,
          status: 'pending',
        },
        select: { id: true },
      })
      trainingSourceIds.push(source.id)
    } catch {
      return NextResponse.json(
        { error: 'Failed to create training source for URL' },
        { status: 500 }
      )
    }
  }

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
  } catch {
    await prisma.trainingSources.updateMany({
      where: { id: { in: trainingSourceIds } },
      data: { status: 'failed', errorMessage: 'Queueing failed' },
    })

    return NextResponse.json({ error: 'Queueing failed' }, { status: 500 })
  }

  return NextResponse.json(
    { message: 'Training queued', total_sources: trainingSourceIds.length },
    { status: 200 }
  )
}

/* ---------------- DELETE TRAINING SOURCE ---------------- */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = await params
  const { source_id } = await request.json()

  if (!bot_id || !source_id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const guard = await requireUserOrgAndBot(request, bot_id)
  if (!guard.ok) return guard.response
  const { organizationId } = guard

  const source = await prisma.trainingSources.findFirst({
    where: { id: source_id, botId: bot_id, organizationId },
  })

  if (!source) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (source.status === 'processing') {
    return NextResponse.json(
      { error: 'Cannot delete while processing' },
      { status: 409 }
    )
  }

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
      '/api/training/source/delete',
      token,
      { source_id }
    )
    await prisma.trainingSources.deleteMany({
      where: { id: source_id, botId: bot_id },
    })
    await prisma.files.deleteMany({
      where: { id: source_id, botId: bot_id },
    })
    return NextResponse.json({ message: 'Deleted' }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
