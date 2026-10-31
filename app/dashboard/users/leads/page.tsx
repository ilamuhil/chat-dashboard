import { notFound, redirect } from 'next/navigation'
import { OrganizationRole } from '@/lib/organization/roles'
import { requireAuthUserId } from '@/lib/auth/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/organization/current-organization'
import { prisma } from '@/lib/core/prisma'
import LeadsClient, { type LeadRow, type LeadStats } from './LeadsClient'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

export default async function LeadsPage() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    redirect('/auth/login')
  }

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const [membership, leadsRaw, total, lastWeek, lastMonth, members] =
    await Promise.all([
      prisma.organizationMembers.findFirst({
        where: { organizationId, userId },
        select: { role: true },
      }),
      prisma.leads.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: { capturedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          capturedAt: true,
          assignedCounsellorId: true,
          leadPriority: true,
          priorityReason: true,
          bot: {
            select: { name: true },
          },
        },
      }),
      prisma.leads.count({
        where: { organizationId, deletedAt: null },
      }),
      prisma.leads.count({
        where: {
          organizationId,
          deletedAt: null,
          capturedAt: { gte: weekAgo },
        },
      }),
      prisma.leads.count({
        where: {
          organizationId,
          deletedAt: null,
          capturedAt: { gte: monthAgo },
        },
      }),
      prisma.organizationMembers.findMany({
        where: {
          organizationId,
          userId: { not: null },
          role: {
            in: [
              OrganizationRole.Owner,
              OrganizationRole.Admin,
              OrganizationRole.Counsellor,
            ],
          },
          user: { isActive: true, isBanned: false },
        },
        select: {
          userId: true,
          user: { select: { fullName: true, email: true } },
        },
      }),
    ])

  if (!membership) notFound()

  const leads: LeadRow[] = leadsRaw.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    capturedAt: lead.capturedAt.toISOString(),
    botName: lead.bot?.name ?? null,
    assignedCounsellorId: lead.assignedCounsellorId,
    leadPriority: lead.leadPriority,
    priorityReason: lead.priorityReason,
  }))

  const stats: LeadStats = {
    total,
    lastWeek,
    lastMonth,
  }

  return (
    <DashboardPageHeader
      title='Leads'
      description='Review visitor details captured by your bots during conversations.'>
      <LeadsClient
        leads={leads}
        userId={userId}
        members={members.flatMap((member) =>
          member.userId
            ? [
                {
                  userId: member.userId,
                  name: member.user?.fullName || null,
                  email: member.user?.email || null,
                },
              ]
            : [],
        )}
        stats={stats}
        isAdmin={[OrganizationRole.Owner, OrganizationRole.Admin].some(
          (role) => role === membership.role,
        )}
      />
    </DashboardPageHeader>
  )
}
