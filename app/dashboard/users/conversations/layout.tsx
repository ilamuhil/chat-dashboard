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
  const conversations = await prisma.conversationsMeta.findMany({
    where: { organizationId },
    select: { id: true, lastMessageAt: true, lastMessageSnippet: true },
    orderBy: { lastMessageAt: 'desc' },
  })
  const leads = await prisma.leads.findMany({
    where: {
      conversationId: { in: conversations.map(conversation => conversation.id) },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      conversationId: true,
    },
  })
  const chats = conversations.map(c => {
    const lead = leads.find(l => l.conversationId === c.id)
    return {
      id: c.id,
      name: lead?.name || 'Unknown',
      email: lead?.email || 'Unknown',
      phone: lead?.phone || 'Unknown',
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      highlightSnippet: c.lastMessageSnippet,
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
