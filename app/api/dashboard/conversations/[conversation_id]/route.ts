import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

const updateSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  isArchived: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversation_id: string }> },
) {
  try {
    const userId = await requireAuthUserId()
    const organizationId = await resolveCurrentOrganizationId({ userId })
    const { conversation_id: conversationId } = await params
    const body = updateSchema.parse(await request.json())

    if (!organizationId || (!body.status && body.isArchived === undefined)) {
      return NextResponse.json(
        { error: 'Invalid conversation update' },
        { status: 400 },
      )
    }

    const conversation = await prisma.conversationsMeta.findFirst({
      where: { id: conversationId, organizationId },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    const updated = await prisma.conversationsMeta.update({
      where: { id: conversation.id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.isArchived !== undefined
          ? { isArchived: body.isArchived }
          : {}),
      },
      select: {
        id: true,
        status: true,
        isArchived: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid conversation update' },
        { status: 400 },
      )
    }

    console.error('Failed to update conversation:', error)
    return NextResponse.json(
      { error: 'Could not update conversation' },
      { status: 500 },
    )
  }
}
