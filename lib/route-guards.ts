import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-token'
import type { NextRequest } from 'next/server'

type GuardFail = { ok: false; response: NextResponse }
type GuardOk<T extends object> = { ok: true } & T

export type UserOrgContext = {
  userId: string
  organizationId: string
}

export type BotContext = {
  bot: { id: string; organizationId: string }
}

function getTokenFromRequest(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length)
  return request.cookies.get('auth_token')?.value
}

export async function requireUserOrg(
  request: NextRequest
): Promise<GuardOk<UserOrgContext> | GuardFail> {
  const token = getTokenFromRequest(request)
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  let userId: string
  try {
    userId = verifyAuthToken(token).sub
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      ),
    }
  }

  return { ok: true, userId, organizationId }
}

export async function requireUserOrgAndBot(
  request: NextRequest,
  botId: string
): Promise<GuardOk<UserOrgContext & BotContext> | GuardFail> {
  const base = await requireUserOrg(request)
  if (!base.ok) return base

  const { organizationId } = base
  const bot = await prisma.bots.findFirst({
    where: { id: botId, organizationId },
    select: { id: true, organizationId: true },
  })

  if (!bot || !bot.organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Bot not found' }, { status: 404 }),
    }
  }

  return {
    ok: true,
    userId: base.userId,
    organizationId,
    bot: { id: bot.id, organizationId: bot.organizationId },
  }
}

