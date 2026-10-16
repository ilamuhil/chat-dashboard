import React, { ReactNode } from 'react'
import ConversationShell from './ConversationShell'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

export default async function ConversationsLayout({
  children,
}: {
  children: ReactNode
}) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const conversations = organizationId
    ? await prisma.conversationsMeta.findMany({
        where: { organizationId },
        select: {
          id: true,
          leadId: true,
          botId: true,
          createdAt: true,
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
    : []
  const chats = conversations.map(c => {
    const lead = c.lead
    return {
      id: c.id,
      leadId: c.leadId,
      botId: c.botId,
      createdAt: c.createdAt.toISOString(),
      name: lead?.name || 'Unknown',
      email: lead?.email || 'Unknown',
      phone: lead?.phone || 'Unknown',
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      highlightSnippet: c.lastMessageSnippet,
      handOverStatus: c.handOverStatus,
      status: c.status,
      isArchived: c.isArchived,
    }
  })

  return (
    <DashboardPageHeader
      title='Conversations'
      description='One place for each lead, with every conversation and the latest information.'
      scrollable={false}>
      <ConversationShell key={organizationId} organizationId={organizationId} chats={chats}>{children}</ConversationShell>
    </DashboardPageHeader>
  )
}
