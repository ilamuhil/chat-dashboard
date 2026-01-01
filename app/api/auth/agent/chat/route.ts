//agent joins in to the chat conversation
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getSecretKey, signToken } from '@/lib/jwt'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { conversation_id } = await request.json()
  if (!conversation_id || typeof conversation_id !== 'string') {
    console.error('Failed to authenticate agent. Invalid conversation id.')
    return NextResponse.json(
      { error: 'Invalid conversation id' },
      { status: 400 }
    )
  }
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations_meta')
    .select('id, bot_id, organization_id')
    .eq('id', conversation_id)
    .maybeSingle()

  if (conversationError || !conversation) {
    console.error(
      'Failed to authenticate agent. Conversation not found.',
      conversationError
    )
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    )
  }

  // Support users belonging to multiple orgs: validate membership for THIS conversation's org.
  const { data: membership, error: membershipError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('organization_id', conversation.organization_id)
    .maybeSingle()

  if (membershipError || !membership) {
    console.error(
      'Failed to authenticate agent. Unauthorized. User not found in organization members table for this conversation org.',
      membershipError
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const privateKey = getSecretKey()
  if (!privateKey) {
    console.error(
      'Failed to authenticate agent. Internal server error. Private pem key not found.'
    )
    return NextResponse.json(
      { error: 'Failed to authenticate agent. Internal server error.' },
      { status: 500 }
    )
  } else {
    //update conversation meta table mode to 'human'
    const { error: conversationUpdateError } = await supabase
      .from('conversations_meta')
      .update({ mode: 'human' })
      .eq('id', conversation_id)
      .eq('organization_id', conversation.organization_id)
      .eq('bot_id', conversation.bot_id)
      .maybeSingle()
    if (conversationUpdateError) {
      console.error(
        'Failed to update conversation meta table. Internal server error. Failed to update conversation mode to human.',
        conversationUpdateError
      )
      return NextResponse.json(
        {
          error:
            'Failed to update conversation meta table. Internal server error. Failed to update conversation mode to human.',
        },
        { status: 500 }
      )
    } else {
      const token = signToken(
        {
          bot_id: conversation.bot_id,
          conversation_id,
          organization_id: conversation.organization_id,
          type: 'assistant',
        },
        privateKey
      )
      return NextResponse.json({ token, conversation_id })
    }
  }
}
