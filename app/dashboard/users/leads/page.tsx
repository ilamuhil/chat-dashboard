import { redirect } from 'next/navigation'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { prisma } from '@/lib/prisma'
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

  const [leadsRaw, total, lastWeek, lastMonth] = await Promise.all([
    prisma.leads.findMany({
      where: { organizationId },
      orderBy: { capturedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        capturedAt: true,
        bot: {
          select: { name: true },
        },
      },
    }),
    prisma.leads.count({
      where: { organizationId },
    }),
    prisma.leads.count({
      where: {
        organizationId,
        capturedAt: { gte: weekAgo },
      },
    }),
    prisma.leads.count({
      where: {
        organizationId,
        capturedAt: { gte: monthAgo },
      },
    }),
  ])

  const leads: LeadRow[] = leadsRaw.map(lead => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    capturedAt: lead.capturedAt.toISOString(),
    botName: lead.bot?.name ?? null,
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
      <LeadsClient leads={leads} stats={stats} />
    </DashboardPageHeader>
  )
}
