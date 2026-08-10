

import React, { ReactNode } from 'react'
import ConversationShell from './ConversationShell'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

export default async function ConversationsLayout({ children }: { children: ReactNode }) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const conversations = await prisma.conversationsMeta.findMany({
    where: { organizationId },
    select: { id: true, lastMessageAt: true, lastMessageSnippet: true },
    orderBy: { lastMessageAt: 'desc' },
    take: 10,
  })
  const leads = await prisma.leads.findMany({
    where: { conversationId: { in: conversations.map(conversation => conversation.id) } },
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
      lastMessageAt: c.lastMessageAt,
      highlightSnippet: c.lastMessageSnippet
    }
  })
  return (
    <main className='flex flex-col h-full min-h-0 overflow-hidden'>
      <header className='shrink-0'>
        <h1 className='dashboard-title'>Conversations</h1>
      </header>
      <section className='flex-1 min-h-0 mt-6 overflow-hidden'>
        <ConversationShell chats={chats} >
          {children}
        </ConversationShell>
      </section>
    </main>
  )
}





