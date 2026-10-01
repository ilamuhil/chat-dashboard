import { notFound } from 'next/navigation'

import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'

import LeadDetailClient, {
  type LeadDetail,
  type OrganizationMemberOption,
} from './LeadDetailClient'

type LeadDetailPageProps = {
  params: Promise<{ lead_id: string }>
}

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  const { lead_id: leadId } = await params
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) notFound()

  const membership = await prisma.organizationMembers.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  })

  if (!membership) notFound()

  const [lead, members] = await Promise.all([
    prisma.leads.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        enquirerType: true,
        studentName: true,
        studentAge: true,
        studentGender: true,
        courseInterest: true,
        educationLevel: true,
        preferredMode: true,
        joiningTimeline: true,
        primaryIntent: true,
        leadPriority: true,
        priorityReason: true,
        aiSummary: true,
        recommendedNextAction: true,
        pipelineStage: true,
        consent_to_contact: true,
        capturedAt: true,
        updatedAt: true,
        deletedAt: true,
        deletedById: true,
        visitorId: true,
        organizationId: true,
        botId: true,
        bot: {
          select: {
            id: true,
            name: true,
            instituteName: true,
          },
        },
        conversations: {
          orderBy: [
            { lastMessageAt: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            createdAt: true,
            lastMessageAt: true,
            lastMessageSnippet: true,
            userName: true,
            userEmail: true,
            mode: true,
            status: true,
            isArchived: true,
            handOverStatus: true,
            closedAt: true,
            bot: { select: { name: true } },
          },
        },
        leadFollowUps: {
          where: { deletedAt: null },
          orderBy: [
            { scheduledFor: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            counsellorId: true,
            followUpType: true,
            status: true,
            scheduledFor: true,
            completedAt: true,
            outcome: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.organizationMembers.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ])

  if (!lead) notFound()

  const { consent_to_contact, leadFollowUps, ...leadFields } = lead
  const memberOptions: OrganizationMemberOption[] = members
    .filter(
      (
        member,
      ): member is typeof member & {
        userId: string
      } => Boolean(member.userId),
    )
    .map(member => ({
      id: member.id,
      userId: member.userId,
      name: member.user?.fullName ?? null,
      email: member.user?.email ?? null,
      role: member.role,
    }))

  const leadDetail: LeadDetail = {
    ...leadFields,
    consentToContact: consent_to_contact,
    capturedAt: lead.capturedAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    deletedAt: lead.deletedAt?.toISOString() ?? null,
    conversations: lead.conversations.map(conversation => ({
      ...conversation,
      createdAt: conversation.createdAt.toISOString(),
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      closedAt: conversation.closedAt?.toISOString() ?? null,
    })),
    followUps: leadFollowUps.map(followUp => ({
      ...followUp,
      scheduledFor: followUp.scheduledFor?.toISOString() ?? null,
      completedAt: followUp.completedAt?.toISOString() ?? null,
      createdAt: followUp.createdAt.toISOString(),
      updatedAt: followUp.updatedAt.toISOString(),
    })),
  }

  return (
    <DashboardPageHeader
      title={lead.name || lead.studentName || 'Lead details'}
      description='Review lead context, update admissions details, and manage follow-ups.'>
      <LeadDetailClient lead={leadDetail} members={memberOptions} />
    </DashboardPageHeader>
  )
}
