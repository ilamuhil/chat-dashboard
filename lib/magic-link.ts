import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'

const MAGIC_LINK_TTL_MINUTES = 15

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createMagicLink(params: {
  userId: string
  organizationId: string
}) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(
    Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000,
  )

  await prisma.magicLinks.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  })

  return { token, expiresAt, expiresInMinutes: MAGIC_LINK_TTL_MINUTES }
}

export async function consumeMagicLink(token: string) {
  const link = await prisma.magicLinks.findFirst({
    where: {
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true, organizationId: true },
  })

  if (!link) return null

  const consumed = await prisma.magicLinks.updateMany({
    where: { id: link.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  if (consumed.count !== 1) return null
  return link
}
