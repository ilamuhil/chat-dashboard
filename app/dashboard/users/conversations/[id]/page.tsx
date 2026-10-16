import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import ChatInterface from './ChatInterface'
import type { ConversationSummaryData } from './ConversationSummary'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { notFound } from 'next/navigation'
import { Message } from './types'
import { prisma } from '@/lib/prisma'
import { getSecretKey, signToken } from '@/lib/jwt'
import axios from 'axios'


export default async function ConversationPage({ params }: { params: { id: string } }) {
  const { id: conversationId } = await params
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId || !conversationId || typeof conversationId !== 'string') {
    console.error('Invalid conversation ID or organization ID')
    console.error('conversationId:', conversationId)
    console.error('organizationId:', organizationId)
    return notFound()
  }

  let leadId: string | null = null
  let summary: ConversationSummaryData | undefined
  let messages: Message[] = []
  let conversationMode = 'ai'
  let conversationHandOverStatus = 'none'
  let conversationStatus = 'open'
  let conversationClosedBy: string | null = null
  let messageLoadError: string | null = null

  try {
    //get conversation and check if it belongs to the organization.
    //TODO bot based conversation seggregation : POST MVP feature

    const conversation = await prisma.conversationsMeta.findFirst({
      where: { id: conversationId, organizationId },
      select: {
        botId: true,
        leadId: true,
        mode: true,
        handOverStatus: true,
        status: true,
        closedBy: true,
        aiSummary: true,
        summaryStatus: true,
        summaryGeneratedAt: true,
      },
    })
    if (!conversation || !conversation.botId) {
      console.error('Conversation not found')
      return notFound()
    }
    leadId = conversation.leadId
    summary = {
      id: conversationId, status: conversation.status, closedBy: conversation.closedBy,
      aiSummary: conversation.aiSummary, summaryStatus: conversation.summaryStatus,
      summaryGeneratedAt: conversation.summaryGeneratedAt?.toISOString() ?? null,
    }
    conversationMode = conversation.mode
    conversationHandOverStatus = conversation.handOverStatus ?? 'none'
    conversationStatus = conversation.status
    conversationClosedBy = conversation.closedBy

    const privateKey = getSecretKey()
    if (!privateKey) {
      console.error('Chat server signing key is not configured')
      return notFound()
    }

    const token = signToken(
      {
        organization_id: organizationId,
        bot_id: conversation.botId,
        conversation_id: conversationId,
        type: 'support_agent',
      },
      privateKey,
    )

    //call python server to get the conversation messages.
    try {
      const response = await pythonApiRequest<{ messages: Message[] }>(
        'GET',
        `/api/conversations/${conversationId}/messages`,
        token,
      )
      messages = response.messages ?? []
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      messageLoadError = axios.isAxiosError(error)
        ? 'Message history is temporarily unavailable. The chat service may be offline.'
        : 'Message history could not be loaded. Please try again.'
    }
  } catch (error) {
    console.error('Error preparing conversation:', error)
    return notFound()
  }

  return (
    <ChatInterface
      conversationId={conversationId}
      messages={messages}
      initialMode={conversationMode}
      initialHandOverStatus={conversationHandOverStatus}
      initialStatus={conversationStatus}
      initialClosedBy={conversationClosedBy}
      initialLoadError={messageLoadError}
      initialSummary={summary}
      leadId={leadId}
    />
  )



}