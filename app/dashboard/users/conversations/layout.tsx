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
          lastMessageAt: true,
          lastMessageSnippet: true,
          handOverStatus: true,
          lead: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      })
    : []
  const chats = conversations.map(c => {
    const lead = c.lead
    return {
      id: c.id,
      name: lead?.name || 'Unknown',
      email: lead?.email || 'Unknown',
      phone: lead?.phone || 'Unknown',
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      highlightSnippet: c.lastMessageSnippet,
      handOverStatus: c.handOverStatus,
    }
  })

  return (
    <DashboardPageHeader
      title='Conversations'
      description='Review live and recent chats between visitors and your bots.'
      scrollable={false}>
      <ConversationShell chats={chats}>{children}</ConversationShell>
    </DashboardPageHeader>
  )
}
