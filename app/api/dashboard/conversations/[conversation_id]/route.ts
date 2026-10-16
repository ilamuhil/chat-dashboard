import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { getSecretKey, signToken } from '@/lib/jwt'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

const updateSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  isArchived: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversation_id: string }> },
) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const { conversation_id: conversationId } = await params
  if (!organizationId) return NextResponse.json({ error: 'Organization not found' }, { status: 403 })
  const conversation = await prisma.conversationsMeta.findFirst({
    where: { id: conversationId, organizationId },
    select: {
      id: true, status: true, closedBy: true, aiSummary: true,
      summaryStatus: true, summaryGeneratedAt: true,
    },
  })
  if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  return NextResponse.json(conversation, { headers: { 'Cache-Control': 'no-store' } })
}

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
      select: { id: true, botId: true },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    if (body.status === 'closed') {
      const key = getSecretKey()
      if (!key) return NextResponse.json({ error: 'Chat service is not configured' }, { status: 503 })
      const token = signToken({ organization_id: organizationId, bot_id: conversation.botId ?? '',
        conversation_id: conversation.id, type: 'support_agent', sub: userId }, key)
      await pythonApiRequest('POST', `/api/conversations/${conversation.id}/close`, token)
    }

    const updated = await prisma.conversationsMeta.update({
      where: { id: conversation.id },
      data: {
        ...(body.status === 'closed'
          ? {}
          : body.status === 'open'
            ? {
                status: 'open' as const,
                mode: 'ai',
                handOverStatus: 'none',
                summaryStatus: 'pending',
                closedBy: null,
                closedAt: null,
              }
            : {}),
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
