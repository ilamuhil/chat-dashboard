//agent joins in to the chat conversation
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSecretKey, signToken } from '@/lib/jwt'
import { verifyAuthToken } from '@/lib/auth-token'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const { conversation_id, agent_takeover = false } =
    (await request.json()) as {
      conversation_id?: string
      agent_takeover?: boolean
    }

  if (!conversation_id || typeof conversation_id !== 'string') {
    return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization')
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null) ??
    request.cookies.get('auth_token')?.value ??
    null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let userId: string
  try {
    userId = verifyAuthToken(token).sub
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversation = await prisma.conversationsMeta.findUnique({
    where: { id: conversation_id },
    select: { id: true, botId: true, organizationId: true },
  })

  if (!conversation || !conversation.organizationId || !conversation.botId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId, organizationId: conversation.organizationId },
    select: { id: true },
  })

  if (!membership) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (agent_takeover) {
    await prisma.conversationsMeta.update({
      where: { id: conversation.id },
      data: { mode: 'human' },
    })
  }

  const privateKey = getSecretKey()
  if (!privateKey) {
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }

  const agentJwt = signToken(
    {
      organization_id: conversation.organizationId,
      bot_id: conversation.botId,
      conversation_id: conversation.id,
      type: 'agent',
    },
    privateKey
  )

  return NextResponse.json({ token: agentJwt, conversation_id: conversation.id }, { status: 200 })
}
