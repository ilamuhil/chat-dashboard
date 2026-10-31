import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { corsHeaders } from '@/lib/auth/auth-server'
import { widgetProfileSelect } from '@/lib/widget/widget-profile'
import { resolveWidgetBot } from '@/lib/widget/resolve-widget-bot'
import {
  publicCaptureSettings,
  readCaptureConfig,
} from '@/lib/widget/capture-config'
const headers = { ...corsHeaders, 'Cache-Control': 'no-store' }
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers })
}
export async function POST(request: NextRequest) {
  const parsed = z
    .object({
      api_key: z.string().min(1).max(256),
      bot_id: z.uuid().optional(),
    })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400, headers },
    )
  const resolved = await resolveWidgetBot(parsed.data.api_key)
  if (
    !resolved ||
    (parsed.data.bot_id && parsed.data.bot_id !== resolved.bot.id)
  )
    return NextResponse.json(
      { error: 'This chat is unavailable' },
      { status: 401, headers },
    )
  const profile = Object.fromEntries(
    Object.keys(widgetProfileSelect).map((key) => [
      key,
      resolved.bot[key as keyof typeof resolved.bot],
    ]),
  )
  return NextResponse.json(
    {
      profile: {
        ...profile,
        capture: publicCaptureSettings(resolved.bot),
        conversationStarters: readCaptureConfig(resolved.bot.leadCaptureConfig)
          .conversationStarters,
      },
    },
    { headers },
  )
}
