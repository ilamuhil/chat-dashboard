import { NextResponse } from 'next/server'
import { prisma } from '@/lib/core/prisma'
import { requireAuthUserId } from '@/lib/auth/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/organization/current-organization'

export async function GET(_request: Request, { params }: {
  params: Promise<{ conversation_id: string }>
}) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  const { conversation_id: id } = await params
  if (!organizationId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const conversation = await prisma.conversationsMeta.findFirst({
    where: { id, organizationId }, select: { leadId: true, botId: true },
  })
  if (!conversation?.leadId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const lead = await prisma.leads.findFirst({
    where: { id: conversation.leadId, organizationId, deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true, aiSummary: true,
      courseInterest: true, preferredMode: true, consent_to_contact: true,
      conversations: {
        where: { organizationId, botId: conversation.botId },
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, createdAt: true, lastMessageAt: true, lastMessageSnippet: true,
          status: true, isArchived: true, aiSummary: true, summaryStatus: true,
        },
      },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { conversations, consent_to_contact, ...profile } = lead
  return NextResponse.json({ lead: { ...profile, consentToContact: consent_to_contact }, conversations })
}
