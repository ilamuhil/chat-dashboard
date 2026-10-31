import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/core/prisma'

import {
  summarizeAdmissions,
  parseReportingWindow,
  type AnalyticsLead,
} from './admissions-metrics'
export { parseReportingWindow } from './admissions-metrics'

export async function loadAdmissionsReport(
  organizationId: string,
  window: ReturnType<typeof parseReportingWindow>,
) {
  // One lead row per cohort member; nested relations cannot multiply totals.
  const [rows, members, tracking] = await prisma.$transaction(
    async (tx) =>
      Promise.all([
        tx.leads.findMany({
          where: {
            organizationId,
            deletedAt: null,
            capturedAt: { gte: window.startAt, lt: window.endAt },
          },
          select: {
            id: true,
            capturedAt: true,
            pipelineStage: true,
            courseInterest: true,
            assignedCounsellorId: true,
            botId: true,
            visitorId: true,
            lostReason: true,
            bot: { select: { name: true } },
            leadFollowUps: {
              select: {
                id: true,
                sourceRequestId: true,
                followUpType: true,
                status: true,
                deletedAt: true,
              },
            },
            activities: {
              select: {
                kind: true,
                body: true,
                createdAt: true,
                details: true,
              },
              where: {
                kind: {
                  in: [
                    'tracking_started',
                    'lead_created',
                    'stage_changed',
                    'request_created',
                  ],
                },
              },
            },
          },
        }),
        tx.organizationMembers.findMany({
          where: { organizationId },
          select: {
            userId: true,
            user: { select: { fullName: true, email: true } },
          },
        }),
        tx.leadActivities.aggregate({
          where: { organizationId, kind: 'tracking_started' },
          _min: { createdAt: true },
        }),
      ]),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 20000,
    },
  )
  const owners = new Map(
    members.map((member) => [
      member.userId,
      member.user?.fullName || member.user?.email || 'Organization member',
    ]),
  )
  const leads: AnalyticsLead[] = rows.map((row) => {
    const visits: { stage: string; at: string }[] = []
    for (const activity of row.activities) {
      const details = activity.details as Record<string, unknown>
      const changes = details.changes as
        Record<string, { from?: string; to?: string }> | undefined
      const stage =
        changes?.pipeline_stage?.to ||
        (['tracking_started', 'lead_created'].includes(activity.kind)
          ? typeof details.pipelineStage === 'string'
            ? details.pipelineStage
            : 'new_enquiry'
          : null)
      if (stage) visits.push({ stage, at: activity.createdAt.toISOString() })
    }
    if (
      !visits.some(
        (visit) => visit.stage === (row.pipelineStage || 'new_enquiry'),
      )
    )
      visits.push({
        stage: row.pipelineStage || 'new_enquiry',
        at: new Date().toISOString(),
      })
    const requests = new Set(
      row.leadFollowUps
        .filter(
          (task) =>
            task.sourceRequestId &&
            ['callback', 'demo', 'campus_visit'].includes(
              task.followUpType || '',
            ),
        )
        .map((task) => task.id),
    )
    for (const activity of row.activities) {
      const details = activity.details as Record<string, unknown>
      if (
        activity.kind === 'request_created' &&
        typeof details.taskId === 'string' &&
        ['callback', 'demo', 'campus_visit'].includes(
          String(details.activityType || activity.body?.replace(/ /g, '_')),
        )
      )
        requests.add(details.taskId)
    }
    return {
      id: row.id,
      capturedAt: row.capturedAt.toISOString(),
      pipelineStage: row.pipelineStage,
      courseInterest: row.courseInterest,
      sourceId: row.botId || (row.visitorId ? 'unavailable' : 'manual'),
      source: row.botId
        ? row.bot?.name || 'Deleted chatbot'
        : row.visitorId
          ? 'Chatbot (source unavailable)'
          : 'Manual',
      ownerId: row.assignedCounsellorId,
      ownerName: owners.get(row.assignedCounsellorId) || 'Former member',
      requestCount: requests.size,
      reviewCount: row.leadFollowUps.filter(
        (task) => task.status === 'requested' && !task.deletedAt,
      ).length,
      lostReason: row.lostReason,
      visits,
    }
  })
  return {
    ...summarizeAdmissions(leads),
    trackingSince: tracking._min.createdAt?.toISOString() || null,
    generatedAt: new Date().toISOString(),
    from: window.from,
    to: window.to,
  }
}
export type AdmissionsReport = Awaited<ReturnType<typeof loadAdmissionsReport>>
