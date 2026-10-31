import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { hashApiKey } from '@/lib/core/utils'
// Hosted identifiers are public, not secret API keys. They only work for an
// explicitly published bot and never grant staff or configuration access.
export async function resolveWidgetBot(key: string) {
  if (key.startsWith('hosted:')) {
    const id = z.uuid().safeParse(key.slice(7))
    if (!id.success) return null
    const bot = await prisma.bots.findFirst({
      where: {
        id: id.data,
        deletedAt: null,
        leadCaptureConfig: { path: ['hostedEnabled'], equals: true },
      },
    })
    return bot?.organizationId ? { bot, apiKeyId: null } : null
  }
  const apiKey = await prisma.apiKeys.findFirst({
    where: { keyHash: hashApiKey(key), isActive: true },
    select: { id: true, botId: true, organizationId: true },
  })
  if (!apiKey?.botId || !apiKey.organizationId) return null
  const bot = await prisma.bots.findFirst({
    where: {
      id: apiKey.botId,
      organizationId: apiKey.organizationId,
      deletedAt: null,
    },
  })
  return bot ? { bot, apiKeyId: apiKey.id } : null
}
