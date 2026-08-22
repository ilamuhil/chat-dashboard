import { NextResponse } from 'next/server'

import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const userId = await requireAuthUserId()
  const organizationId =
    await resolveCurrentOrganizationId({ userId })
  const { id } = await context.params

  if (!organizationId) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 400 },
    )
  }

  const notification =
    await prisma.notifications.findFirst({
      where: {
        id,
        userId,
        organizationId,
      },
    })

  if (!notification) {
    return NextResponse.json(
      { error: 'Notification not found' },
      { status: 404 },
    )
  }

  if (notification.readAt) {
    return NextResponse.json(notification)
  }

  const updated =
    await prisma.notifications.update({
      where: { id },
      data: {
        readAt: new Date(),
      },
    })

  return NextResponse.json(updated)
}