import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { createClient } from '@/lib/supabase-server'

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
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })
  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('id', bot_id)
    .eq('organization_id', organizationId)
    .single()
  if (botError || !bot) {
    return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
  }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = (await params) as { bot_id: string }
  const { source_id } = await request.json()
  if (!source_id) {
    return NextResponse.json(
      { error: 'Source ID is required' },
      { status: 400 }
    )
  }
  if (!bot_id) {
    return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 })
  }
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })
  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  const { data: trainingSource, error: trainingSourceError } = await supabase
    .from('training_sources')
    .select('*')
    .eq('id', source_id)
    .eq('bot_id', bot_id)
    .eq('organization_id', organizationId)
    .single()
  if (trainingSourceError || !trainingSource) {
    return NextResponse.json(
      { error: 'Unauthorized operation' },
      { status: 404 }
    )
  }

  const privateKey = getSecretKey()
  if (!privateKey) {
    console.error('Failed to get private key for training source deletion')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }

  const token = signToken(
    {
      organization_id: organizationId,
      bot_id,
      type: 'agent',
    },
    privateKey,
    '5m'
  )

  const response = await fetch(`/api/training/${source_id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ source_id }),
  })
  if (!response.ok) {
    const errorData = await response.json()
    if (!errorData?.error) {
      console.error('Error deleting training source:', errorData)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    } else {
      console.error('Error deleting training source:', errorData)
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete training source' },
        { status: response.status }
      )
    }
  }
  return NextResponse.json(
    { message: 'Training source deleted successfully' },
    { status: 200 }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = await params
  if (!bot_id) {
    return NextResponse.json(
      { error: 'Invalid bot selected for training' },
      { status: 400 }
    )
  }

  const formData = await request.formData()

  const sourcesRaw =
    formData.get('sources') ??
    (formData.getAll('sources')[0] as FormDataEntryValue | undefined)

  const filesMetaRaw =
    formData.get('files_meta') ??
    (formData.getAll('files_meta')[0] as FormDataEntryValue | undefined)

  if (typeof sourcesRaw !== 'string') {
    return NextResponse.json(
      { error: 'Invalid sources payload' },
      { status: 400 }
    )
  }

  const sources = JSON.parse(sourcesRaw) as Array<{
    type: 'file' | 'url'
    value: string
  }>

  if (!sources || sources.length === 0) {
    return NextResponse.json(
      { error: 'No sources provided for training' },
      { status: 400 }
    )
  }

  const hasUrls = sources.some(s => s.type === 'url')

  const filesMeta =
    typeof filesMetaRaw === 'string'
      ? (JSON.parse(filesMetaRaw) as Array<{
          original_filename: string
          size_bytes: number
          mime_type: string
        }>)
      : []

  const files = formData.getAll('files') as File[]

  const supabase = await createClient()
  const { data: user, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })
  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization not found' },
      { status: 404 }
    )
  }

  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id')
    .eq('id', bot_id)
    .eq('organization_id', organizationId)
    .single()

  if (botError || !bot) {
    return NextResponse.json(
      { error: 'Invalid bot selected for training' },
      { status: 404 }
    )
  }

  // Prevent concurrent training
  const { data: activeSources } = await supabase
    .from('training_sources')
    .select('id')
    .eq('bot_id', bot_id)
    .in('status', ['pending', 'processing'])

  if (activeSources && activeSources.length > 0) {
    return NextResponse.json(
      { error: 'Training already in progress for this bot' },
      { status: 409 }
    )
  }

  const trainingSourceIds: string[] = []
  const uploadedPaths: string[] = []
  const fileRecordIds: string[] = []

  // ---------- FILE UPLOAD FLOW ----------
  if (files.length > 0) {
    if (filesMeta.length !== files.length) {
      return NextResponse.json(
        { error: 'Files metadata does not match files length' },
        { status: 400 }
      )
    }

    const uploadTargets = files.map((file, index) => {
      const safeName = `${crypto.randomUUID()}-${filesMeta[index].original_filename}`
      return {
        file,
        meta: filesMeta[index],
        path: `organizations/${organizationId}/bots/${bot_id}/${safeName}`,
      }
    })

    const uploadResponses = await Promise.all(
      uploadTargets.map(target =>
        supabase.storage.from(BUCKET).upload(target.path, target.file)
      )
    )

    const failedUploads = uploadResponses.find(r => r.error)
    if (failedUploads) {
      await supabase.storage.from(BUCKET).remove(
        uploadResponses
          .map((r, i) => (r.error ? null : uploadTargets[i].path))
          .filter(Boolean) as string[]
      )
      return NextResponse.json(
        { error: 'File upload failed' },
        { status: 500 }
      )
    }

    uploadedPaths.push(...uploadTargets.map(t => t.path))

    const fileRecordsData = uploadTargets.map(target => ({
      organization_id: organizationId,
      bot_id,
      bucket: BUCKET,
      path: target.path,
      original_filename: target.meta.original_filename,
      mime_type: target.meta.mime_type,
      size_bytes: target.meta.size_bytes,
      purpose: 'training',
      status: 'uploaded',
    }))

    const { data: fileRecords, error: fileError } = await supabase
      .from('files')
      .insert(fileRecordsData)
      .select('id')

    if (fileError || !fileRecords) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths)
      return NextResponse.json(
        { error: 'Failed to create file records' },
        { status: 500 }
      )
    }

    fileRecordIds.push(...fileRecords.map(r => r.id))

    const { data: fileSources, error: sourceError } = await supabase
      .from('training_sources')
      .insert(
        fileRecordIds.map(id => ({
          organization_id: organizationId,
          bot_id,
          type: 'file',
          source_value: id,
          status: 'pending',
        }))
      )
      .select('id')

    if (sourceError || !fileSources) {
      await supabase.from('files').delete().in('id', fileRecordIds)
      await supabase.storage.from(BUCKET).remove(uploadedPaths)
      return NextResponse.json(
        { error: 'Failed to create training sources for files' },
        { status: 500 }
      )
    }

    trainingSourceIds.push(...fileSources.map(s => s.id))
  }

  // ---------- URL SOURCES ----------
  if (hasUrls) {
    const { data: urlSources, error: urlError } = await supabase
      .from('training_sources')
      .insert(
        sources
          .filter(s => s.type === 'url')
          .map(s => ({
            organization_id: organizationId,
            bot_id,
            type: 'url',
            source_value: s.value,
            status: 'pending',
          }))
      )
      .select('id')

    if (urlError || !urlSources) {
      return NextResponse.json(
        { error: 'Failed to create training sources for URLs' },
        { status: 500 }
      )
    }

    trainingSourceIds.push(...urlSources.map(s => s.id))
  }

  // ---------- CALL PYTHON ----------
  const pythonApiUrl = process.env.PYTHON_API_URL
  if (!pythonApiUrl) {
    return NextResponse.json(
      { error: 'Python service not configured' },
      { status: 500 }
    )
  }

  const privateKey = getSecretKey()
  const token = signToken(
    { organization_id: organizationId, bot_id, type: 'agent' },
    privateKey,
    '5m'
  )

  const res = await fetch(`${pythonApiUrl}/api/training/queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bot_id,
      source_ids: trainingSourceIds,
    }),
  })

  if (!res.ok) {
    await supabase
      .from('training_sources')
      .update({ status: 'failed', error_message: 'Queueing failed' })
      .in('id', trainingSourceIds)

    return NextResponse.json(
      { error: 'Failed to queue training job' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      message: 'Training queued successfully',
      total_sources: trainingSourceIds.length,
    },
    { status: 200 }
  )
}


