import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { bot_id: string } }
) {
  const { bot_id: id } = await params()
  const bot_id = parseInt(+id)
  if (!bot_id || isNaN(bot_id)) {
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
  const { data: trainingSources, error: trainingSourcesError } = await supabase
    .from('training_sources')
    .select('id, type, source_value, status')
    .eq('bot_id', bot_id)
  if (trainingSourcesError) {
    return NextResponse.json(
      { error: 'Failed to get training sources' },
      { status: 500 }
    )
  }
  file_ids = trainingSources
    .filter(source => source.type === 'file')
    .map(source => source.id)
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('id, original_filename, mime_type, size_bytes')
    .in('id', file_ids)
  if (filesError) {
    return NextResponse.json({ error: 'Failed to get files' }, { status: 500 })
  }
  const trainingSourcesWithFiles = trainingSources.map(source => {
    if (source.type === 'file') {
      const file = files.find(file => file.id === source.id)
      return { ...source, file }
    }
    return source
  })

  return NextResponse.json({ sources: trainingSourcesWithFiles })
}

export async function DELETE()
