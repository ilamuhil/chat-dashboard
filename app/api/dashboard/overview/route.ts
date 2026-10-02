import { NextResponse } from 'next/server'

import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 400 },
    )
  }

  const activeBotWhere = {
    organizationId,
    deletedAt: null,
  }
  const activeSourceWhere = {
    organizationId,
    deletedAt: null,
  }
  const activeLeadWhere = {
    organizationId,
    deletedAt: null,
  }
  const conversationWhere = { organizationId }

  const [
    botCount,
    sourceCount,
    apiKeyCount,
    memberCount,
    conversationCount,
    openConversationCount,
    closedConversationCount,
    archivedConversationCount,
    leadCount,
    recentLeadCount,
    recentWeekLeadCount,
    trainingStatusGroups,
    recentConversations,
  ] = await Promise.all([
    prisma.bots.count({ where: activeBotWhere }),
    prisma.trainingSources.count({ where: activeSourceWhere }),
    prisma.apiKeys.count({
      where: { organizationId, isActive: true },
    }),
    prisma.organizationMembers.count({ where: { organizationId } }),
    prisma.conversationsMeta.count({ where: conversationWhere }),
    prisma.conversationsMeta.count({
      where: { ...conversationWhere, isArchived: false, status: 'open' },
    }),
    prisma.conversationsMeta.count({
      where: { ...conversationWhere, isArchived: false, status: 'closed' },
    }),
    prisma.conversationsMeta.count({
      where: { ...conversationWhere, isArchived: true },
    }),
    prisma.leads.count({ where: activeLeadWhere }),
    prisma.leads.count({
      where: {
        ...activeLeadWhere,
        capturedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.leads.count({
      where: {
        ...activeLeadWhere,
        capturedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.trainingSources.groupBy({
      by: ['status'],
      where: activeSourceWhere,
      _count: { _all: true },
    }),
    prisma.conversationsMeta.findMany({
      where: conversationWhere,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        userName: true,
        userEmail: true,
        status: true,
        isArchived: true,
        lastMessageSnippet: true,
        lastMessageAt: true,
        createdAt: true,
      },
    }),
  ])

  const trainingByStatus = Object.fromEntries(
    trainingStatusGroups.map(group => [
      group.status ?? 'unknown',
      group._count._all,
    ]),
  )

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    setup: {
      botCount,
      sourceCount,
      apiKeyCount,
      memberCount,
    },
    conversations: {
      total: conversationCount,
      open: openConversationCount,
      closed: closedConversationCount,
      archived: archivedConversationCount,
    },
    leads: {
      total: leadCount,
      last30Days: recentLeadCount,
      last7Days: recentWeekLeadCount,
    },
    training: {
      total: sourceCount,
      byStatus: trainingByStatus,
    },
    recentConversations: recentConversations.map(conversation => ({
      id: conversation.id,
      name: conversation.userName || 'Anonymous visitor',
      email: conversation.userEmail,
      status: conversation.status,
      isArchived: conversation.isArchived,
      snippet: conversation.lastMessageSnippet,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
    })),
  })
}
