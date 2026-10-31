import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { OrganizationRole } from '@/lib/organization/roles'
import { FollowUpWorkspace } from '@/components/leads/follow-up-workspace'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { prisma } from '@/lib/core/prisma'

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>
}) {
  const { userId, organizationId } = await requireOrganizationMembership()
  const { task } = await searchParams
  const [items, members, leads] = await Promise.all([
    prisma.leadFollowUps.findMany({
      where: { deletedAt: null, lead: { organizationId, deletedAt: null } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        lead: { select: { name: true, studentName: true, leadPriority: true } },
      },
    }),
    prisma.organizationMembers.findMany({
      where: {
        role: {
          in: [
            OrganizationRole.Owner,
            OrganizationRole.Admin,
            OrganizationRole.Counsellor,
          ],
        },
        organizationId,
        userId: { not: null },
      },
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.leads.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { capturedAt: 'desc' },
      select: {
        id: true,
        name: true,
        assignedCounsellorId: true,
        consent_to_contact: true,
        email: true,
        phone: true,
      },
    }),
  ])
  return (
    <DashboardPageHeader
      title='Follow-ups'
      description='Plan the next step, work through due activities, and keep every lead moving.'>
      <FollowUpWorkspace
        key={task || 'all'}
        userId={userId}
        initialNow={new Date().toISOString()}
        requestedTask={task}
        leads={leads.map((lead) => ({
          ...lead,
          consentToContact: lead.consent_to_contact,
        }))}
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
        items={items.map((item) => ({
          ...item,
          lead: undefined,
          leadName: item.lead.name || item.lead.studentName || 'Unnamed lead',
          leadPriority: item.lead.leadPriority,
          scheduledFor: item.scheduledFor?.toISOString() || null,
          completedAt: item.completedAt?.toISOString() || null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        }))}
      />
    </DashboardPageHeader>
  )
}
