import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { hashApiKey } from '@/lib/utils'
import { getSecretKey, signToken } from '@/lib/jwt'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  // Gets the api key, tenanant/organization id and bot id from the request body
  //type check the api key (uuid), tenant id (uuid) and bot id (integer)

  const body = await request.json()
  const { api_key, bot_id } = body

  if (!api_key || !bot_id) {
    console.error(
      'Failed to authenticate user. Missing api key, tenant id or bot id.',
      api_key,
      bot_id
    )
    return NextResponse.json(
      { error: 'Missing api key, tenant id or bot id' },
      { status: 400, headers: corsHeaders }
    )
  } else if (typeof api_key !== 'string' || typeof bot_id !== 'number') {
    return NextResponse.json(
      { error: 'Invalid api key, tenant id or bot id' },
      { status: 400, headers: corsHeaders }
    )
  } else {
    const supabase = await createClient(true)
    //Check if a bot exists with the given bot id and matches the organization id
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, organization_id')
      .eq('id', bot_id)
      .single()
    if (botError || !bot) {
      console.error('Failed to authenticate user. Bot not found.', botError)
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404, headers: corsHeaders }
      )
    }
    //Check if the api key is valid and has the same bot id as that in the database

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', hashApiKey(api_key))
      .eq('is_active', true)
      .eq('bot_id', bot_id)
      .single()
    if (apiKeyError || !apiKeyData || apiKeyData.bot_id !== bot_id) {
      console.error(
        'Failed to authenticate user. Invalid api key.',
        apiKeyError
      )
      return NextResponse.json(
        { error: 'Invalid api key' },
        { status: 401, headers: corsHeaders }
      )
    }
    //Create a new conversation in the database and use it for the payload of the jwt response
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations_meta')
      .insert({
        organization_id: bot.organization_id,
        bot_id: bot_id,
        api_key_id: apiKeyData.id,
        status: 'connected',
      })
      .select()
      .single()
    if (conversationError || !conversation) {
      console.error(
        'Failed to create conversation. Internal server error.',
        conversationError
      )
      return NextResponse.json(
        { error: 'Failed to create conversation. Internal server error.' },
        { status: 500, headers: corsHeaders }
      )
    }
    //Create a jwt response with the bot id and organization id and the conversation id
    const privateKey = getSecretKey()
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Failed to create token. Internal server error.' },
        { status: 500, headers: corsHeaders }
      )
    }
    const token = signToken(
      {
        organization_id: bot.organization_id,
        bot_id: bot_id,
        conversation_id: conversation.id,
        type: 'user',
      },
      privateKey
    )
    return NextResponse.json(
      { token: token, conversation_id: conversation.id },
      { headers: corsHeaders }
    )
  }
}
