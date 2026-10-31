import { NextResponse } from 'next/server'

import { requireAuthUserId } from '@/lib/auth/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/organization/current-organization'
import { prisma } from '@/lib/core/prisma'

export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ id: string }>
  },
) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const { id } = await context.params

  if (!organizationId) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 400 },
    )
  }

  const result = await prisma.notifications.updateMany({
    data: { dismissedAt: new Date() },
    where: {
      id,
      dismissedAt: null,
      userId,
      organizationId,
    },
  })

  if (result.count === 0) {
    return NextResponse.json(
      { error: 'Notification not found' },
      { status: 404 },
    )
  }

  return NextResponse.json({ id })
}
