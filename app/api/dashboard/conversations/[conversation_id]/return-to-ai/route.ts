import { NextResponse } from 'next/server'
import { readOrganizationRole } from '@/lib/organization/organization-members'
import { isAxiosError } from 'axios'
import { prisma } from '@/lib/core/prisma'
import { requireOrganizationPermission } from '@/lib/organization/organization-members'
import { getSecretKey, signToken } from '@/lib/auth/jwt'
import { pythonApiRequest } from '@/lib/http/axios-server-config'
import { leadApiError } from '@/lib/organization/lead-schemas'
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ conversation_id: string }> },
) {
  try {
    const { organizationId, userId } =
      await requireOrganizationPermission('operate')
    const { conversation_id } = await params
    const conversation = await prisma.conversationsMeta.findFirst({
      where: { id: conversation_id, organizationId },
      select: { id: true, botId: true, handoverVersion: true },
    })
    if (!conversation?.botId)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    const key = getSecretKey()
    if (!key)
      return NextResponse.json(
        { error: 'Chat service is unavailable' },
        { status: 503 },
      )
    const token = signToken(
      {
        organization_id: organizationId,
        bot_id: conversation.botId,
        conversation_id,
        type: 'support_agent',
        organization_role: await readOrganizationRole(organizationId, userId),
        sub: userId,
        handover_version: conversation.handoverVersion,
      },
      key,
      '1m',
    )
    const result = await pythonApiRequest(
      'POST',
      `/api/conversations/${conversation_id}/return-to-ai`,
      token,
    )
    return NextResponse.json(result)
  } catch (error) {
    if (isAxiosError(error))
      return NextResponse.json(
        {
          error:
            error.response?.data?.detail || 'Could not return this chat to AI',
        },
        { status: error.response?.status || 503 },
      )
    return leadApiError(error, 'Could not return this chat to AI')
  }
}
