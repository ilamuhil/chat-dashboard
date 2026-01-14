import { getSecretKey, signToken } from '@/lib/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { createClient } from '@/lib/supabase-server'

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

  const { data: trainingSourcesRaw, error: trainingSourcesError } = await supabase
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
  const trainingSourcesWithFiles = trainingSources.map((source: TrainingSource) => {
    if (source.type === 'file') {
      const file = files.find((file: { id: string }) => file.id === source.id)
      return { ...source, file }
    }
    return source
  })

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
