import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { getSecretKey, signToken } from '@/lib/auth/jwt'
import { corsHeaders } from '@/lib/auth/auth-server'
import { resolveWidgetBot } from '@/lib/widget/resolve-widget-bot'
import { publicCaptureSettings } from '@/lib/widget/capture-config'
const headers = { ...corsHeaders, 'Cache-Control': 'no-store' }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers })
}
export async function POST(request: NextRequest) {
  const parsed = z
    .object({ api_key: z.string().min(1).max(256) })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers },
    )
  const resolved = await resolveWidgetBot(parsed.data.api_key)
  if (!resolved?.bot.organizationId)
    return NextResponse.json(
      { error: 'This chat is unavailable' },
      { status: 401, headers },
    )
  const { bot, apiKeyId } = resolved
  const key = getSecretKey()
  if (!key)
    return NextResponse.json(
      { error: 'Chat is temporarily unavailable' },
      { status: 503, headers },
    )
  const conversation = await prisma.conversationsMeta.create({
    data: {
      organizationId: bot.organizationId!,
      botId: bot.id,
      apiKeyId,
      status: 'open',
      lastMessageAt: new Date(),
    },
    select: { id: true },
  })
  const token = signToken(
    {
      organization_id: bot.organizationId!,
      bot_id: bot.id,
      conversation_id: conversation.id,
      type: 'user',
    },
    key,
  )
  return NextResponse.json(
    {
      token,
      conversation_id: conversation.id,
      bot_config: {
        leadCaptureTiming: bot.leadCaptureTiming,
        captureName: bot.captureName,
        captureEmail: bot.captureEmail,
        capturePhone: bot.capturePhone,
        capture: publicCaptureSettings(bot),
      },
    },
    { headers },
  )
}
