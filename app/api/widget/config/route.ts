import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashApiKey } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { corsHeaders } from '@/lib/auth-server'
import { widgetProfileSelect } from '@/lib/widget-profile'

const headers = { ...corsHeaders, 'Cache-Control': 'no-store' }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers })
}

// Read-only bootstrap. Fetching a header never creates a conversation or token.
export async function POST(request: NextRequest) {
  const parsed = z
    .object({ api_key: z.string().min(1).max(256), bot_id: z.uuid().optional() })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers },
    )
  const apiKey = await prisma.apiKeys.findFirst({
    where: {
      keyHash: hashApiKey(parsed.data.api_key),
      isActive: true,
      ...(parsed.data.bot_id ? { botId: parsed.data.bot_id } : {}),
    },
    select: { organizationId: true, botId: true },
  })
  if (!apiKey?.organizationId || !apiKey.botId)
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401, headers },
    )
  const profile = await prisma.bots.findFirst({
    where: {
      id: apiKey.botId,
      organizationId: apiKey.organizationId,
      deletedAt: null,
    },
    select: widgetProfileSelect,
  })
  if (!profile)
    return NextResponse.json(
      { error: 'Bot not found' },
      { status: 404, headers },
    )
  return NextResponse.json({ profile }, { headers })
}
