import { createClient } from '@/lib/supabase-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

type GuardFail = { ok: false; response: NextResponse }
type GuardOk<T extends object> = { ok: true } & T

export type UserOrgContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  organizationId: string
}

export type BotContext = {
  bot: { id: string; organization_id: string }
}

export async function requireUserOrg(): Promise<
  GuardOk<UserOrgContext> | GuardFail
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })

  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      ),
    }
  }

  return { ok: true, supabase, user, organizationId }
}

export async function requireUserOrgAndBot(botId: string): Promise<
  GuardOk<UserOrgContext & BotContext> | GuardFail
> {
  const base = await requireUserOrg()
  if (!base.ok) return base

  const { supabase, organizationId } = base
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('id, organization_id')
    .eq('id', botId)
    .eq('organization_id', organizationId)
    .single()

  if (botError || !bot) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Bot not found' }, { status: 404 }),
    }
  }

  return { ok: true, supabase: base.supabase, user: base.user, organizationId, bot }
}

