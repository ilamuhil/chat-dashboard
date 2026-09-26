import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

const typeSchema = z.enum(['all', 'open', 'closed', 'archived'])

export async function GET(request: NextRequest) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const requestedType = request.nextUrl.searchParams.get('type') ?? 'all'
  const type = typeSchema.safeParse(requestedType)

  if (!organizationId || !type.success) {
    return NextResponse.json(
      { error: 'Invalid conversation filter' },
      { status: 400 },
    )
  }

  const where =
    type.data === 'archived'
      ? { organizationId, isArchived: true }
      : type.data === 'open'
        ? { organizationId, isArchived: false, status: 'open' }
        : type.data === 'closed'
          ? { organizationId, isArchived: false, status: 'closed' }
          : { organizationId }

  const conversations = await prisma.conversationsMeta.findMany({
    where,
    select: {
      id: true,
      lastMessageAt: true,
      lastMessageSnippet: true,
      status: true,
      isArchived: true,
      handOverStatus: true,
      lead: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(
    conversations.map(conversation => ({
      id: conversation.id,
      name: conversation.lead?.name || 'Unknown',
      email: conversation.lead?.email || 'Unknown',
      phone: conversation.lead?.phone || 'Unknown',
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      highlightSnippet: conversation.lastMessageSnippet,
      handOverStatus: conversation.handOverStatus,
      status: conversation.status,
      isArchived: conversation.isArchived,
    })),
  )
}
