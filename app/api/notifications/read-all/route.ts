import { NextResponse } from 'next/server'

import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export async function PATCH() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 400 },
    )
  }

  await prisma.notifications.updateMany({
    where: {
      userId,
      organizationId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  })

  const notifications = await prisma.notifications.findMany({
    where: {
      userId,
      organizationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  })

  return NextResponse.json(notifications)
}
