import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { requireUserOrgAndBot } from '@/lib/route-guards'
import { pythonApiRequest } from '@/lib/axios-server-config'


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
  const guard = await requireUserOrgAndBot(bot_id)
  if (!guard.ok) return guard.response
  const { supabase } = guard
  type TrainingSource = {
    id: string
    type: 'file' | 'url'
    source_value: string
    status: string | null
  }

  const { data: trainingSourcesRaw, error: trainingSourcesError } =
    await supabase
      .from('training_sources')
      .select('id, type, source_value, status')
      .eq('bot_id', bot_id)
  if (trainingSourcesError) {
    return NextResponse.json(
      { error: 'Failed to get training sources' },
      { status: 500 }
    )
  }
  const trainingSources = (trainingSourcesRaw ?? []) as TrainingSource[]

  const file_ids = trainingSources
    .filter((source: TrainingSource) => source.type === 'file')
    .map((source: TrainingSource) => source.id)
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('id, original_filename, mime_type, size_bytes')
    .in('id', file_ids)
  if (filesError) {
    return NextResponse.json({ error: 'Failed to get files' }, { status: 500 })
  }
  const trainingSourcesWithFiles = trainingSources.map(
    (source: TrainingSource) => {
      if (source.type === 'file') {
        const file = files.find((file: { id: string }) => file.id === source.id)
        return { ...source, file }
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

  const guard = await requireUserOrgAndBot(bot_id)
  if (!guard.ok) return guard.response
  const { supabase, organizationId } = guard

  // Prevent concurrent training
  const { data: active } = await supabase
    .from('training_sources')
    .select('id')
    .eq('bot_id', bot_id)
    .in('status', ['pending', 'processing'])

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

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file)

      if (uploadError) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
      }

      uploadedPaths.push(path)

      const { data: fileRow, error: fileRowError } = await supabase
        .from('files')
        .insert({
          organization_id: organizationId,
          bot_id,
          bucket: BUCKET,
          path,
          original_filename: meta.original_filename,
          mime_type: meta.mime_type,
          size_bytes: meta.size_bytes,
          purpose: 'training',
          status: 'uploaded',
        })
        .select('id')
        .single()

      if (fileRowError || !fileRow) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths)
        return NextResponse.json(
          { error: 'Failed to create file record' },
          { status: 500 }
        )
      }

      const { data: source, error: sourceError } = await supabase
        .from('training_sources')
        .insert({
          organization_id: organizationId,
          bot_id,
          type: 'file',
          source_value: fileRow.id,
          status: 'pending',
        })
        .select('id')
        .single()

      if (sourceError || !source) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths)
        return NextResponse.json(
          { error: 'Failed to create training source for file' },
          { status: 500 }
        )
      }

      trainingSourceIds.push(source.id)
    }
  }

  /* ---------- URL SOURCES ---------- */
  const uniqueUrls = [
    ...new Set(sources.filter(s => s.type === 'url').map(s => s.value!)),
  ]

  for (const url of uniqueUrls) {
    const { data: source, error: urlSourceError } = await supabase
      .from('training_sources')
      .insert({
        organization_id: organizationId,
        bot_id,
        type: 'url',
        source_value: url,
        status: 'pending',
      })
      .select('id')
      .single()

    if (urlSourceError || !source) {
      return NextResponse.json(
        { error: 'Failed to create training source for URL' },
        { status: 500 }
      )
    }

    trainingSourceIds.push(source.id)
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
    await supabase
      .from('training_sources')
      .update({ status: 'failed', error_message: 'Queueing failed' })
      .in('id', trainingSourceIds)

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

  const guard = await requireUserOrgAndBot(bot_id)
  if (!guard.ok) return guard.response
  const { supabase, organizationId } = guard

  const { data: source } = await supabase
    .from('training_sources')
    .select('*')
    .eq('id', source_id)
    .eq('bot_id', bot_id)
    .eq('organization_id', organizationId)
    .single()

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
    return NextResponse.json({ message: 'Deleted' }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
