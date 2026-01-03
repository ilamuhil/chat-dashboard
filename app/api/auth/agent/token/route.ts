//agent joins in to the chat conversation
import { NextRequest, NextResponse } from 'next/server'
import { getAgentJwt } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const { conversation_id, agent_takeover = false } =
    (await request.json()) as {
      conversation_id?: string
      agent_takeover?: boolean
    }

  if (!conversation_id || typeof conversation_id !== 'string') {
    return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })
  }

  const result = await getAgentJwt(conversation_id)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 })
  }

  if (agent_takeover) {
    const supabase = await createClient()

    const { error: conversationUpdateError } = await supabase
      .from('conversations_meta')
      .update({ mode: 'human' })
      .eq('id', result.conversation_id)
      .eq('organization_id', result.organization_id)
      .eq('bot_id', result.bot_id)

    if (conversationUpdateError) {
      console.error(
        'Failed to update conversation meta table. Internal server error. Failed to update conversation mode to human.',
        conversationUpdateError
      )
      return NextResponse.json(
        { error: 'Failed to takeover conversation' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { token: result.token, conversation_id: result.conversation_id },
    { status: result.status }
  )
}
