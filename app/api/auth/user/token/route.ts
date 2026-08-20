import { NextRequest, NextResponse } from 'next/server'
import { hashApiKey } from '@/lib/utils'
import { getSecretKey, signToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { corsHeaders } from '@/lib/auth-server'

//! this route is used to mint a token for the end_user used to chat with the bot/support_agent. Do not use this route to mint a token for the support_agent.

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = z
    .object({
      api_key: z.string().min(1),
      bot_id: z.string().uuid(),
    })
    .safeParse(body)

  if (!parsed.success) {
    console.error(
      'Failed to authenticate user. Invalid request body.',
      parsed.error.flatten().fieldErrors,
    )
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: corsHeaders },
    )
  }

  const { api_key, bot_id } = parsed.data

  const bot = await prisma.bots.findUnique({
    where: { id: bot_id },
    select: {
      id: true,
      organizationId: true,
      leadCaptureTiming: true,
      captureName: true,
      captureEmail: true,
      capturePhone: true,
    },
  })
  if (!bot || !bot.organizationId) {
    return NextResponse.json(
      { error: 'Bot not found' },
      { status: 404, headers: corsHeaders },
    )
  }

  const apiKey = await prisma.apiKeys.findFirst({
    where: { keyHash: hashApiKey(api_key), isActive: true, botId: bot_id },
    select: { id: true },
  })
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid api key' },
      { status: 401, headers: corsHeaders },
    )
  }

  const conversation = await prisma.conversationsMeta.create({
    data: {
      organizationId: bot.organizationId,
      botId: bot_id,
      apiKeyId: apiKey.id,
      status: 'open',
    },
    select: { id: true },
  })

  const privateKey = getSecretKey()
  if (!privateKey) {
    return NextResponse.json(
      { error: 'Failed to create token. Internal server error.' },
      { status: 500, headers: corsHeaders },
    )
  }

  const token = signToken(
    {
      organization_id: bot.organizationId,
      bot_id: bot_id,
      conversation_id: conversation.id,
      type: 'user',
    },
    privateKey,
  )
  return NextResponse.json(
    {
      token: token,
      conversation_id: conversation.id,
      bot_config: {
        leadCaptureTiming: bot.leadCaptureTiming,
        captureName: bot.captureName,
        captureEmail: bot.captureEmail,
        capturePhone: bot.capturePhone,
      },
    },
    { headers: corsHeaders },
  )
}
