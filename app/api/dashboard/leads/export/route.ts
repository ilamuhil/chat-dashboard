import { customAnswers } from '@/lib/leads/custom-answers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { requireOrganizationPermission } from '@/lib/organization/organization-members'
import { leadApiError } from '@/lib/organization/lead-schemas'
import { toCsv } from '@/lib/leads/csv'
export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganizationPermission('export')
    const { ids } = z
      .object({ ids: z.array(z.uuid()).min(1).max(10000) })
      .strict()
      .parse(await request.json())
    const rows = await prisma.leads.findMany({
      where: { organizationId, deletedAt: null, id: { in: ids } },
      orderBy: [{ capturedAt: 'desc' }, { id: 'asc' }],
      include: { bot: { select: { name: true } } },
    })
    const members = await prisma.organizationMembers.findMany({
      where: { organizationId },
      select: {
        userId: true,
        user: { select: { fullName: true, email: true } },
      },
    })
    const names = new Map(
      members.map((m) => [m.userId, m.user?.fullName || m.user?.email || '']),
    )
    const questions = new Map<string, string>()
    rows.forEach((row) =>
      Object.entries(customAnswers(row.profileMetadata)).forEach(
        ([id, answer]) => questions.set(id, answer.label),
      ),
    )
    const idsForQuestions = [...questions.keys()].sort()
    const csv = toCsv(
      [
        'Lead ID',
        'Name',
        'Email',
        'Phone',
        'Course',
        'Stage',
        'Priority',
        'Priority reason',
        'Counsellor',
        'Source',
        'Contact consent',
        'Next action',
        'Lost reason',
        'Captured at (UTC)',
        ...idsForQuestions.map((id) => questions.get(id)!),
      ],
      rows.map((l) => [
        l.id,
        l.name,
        l.email,
        l.phone,
        l.courseInterest,
        l.pipelineStage,
        l.leadPriority,
        l.priorityReason,
        names.get(l.assignedCounsellorId),
        l.bot?.name || 'Manual',
        l.consent_to_contact,
        l.recommendedNextAction,
        l.lostReason,
        l.capturedAt.toISOString(),
        ...idsForQuestions.map(
          (id) => customAnswers(l.profileMetadata)[id]?.value ?? '',
        ),
      ]),
    )
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads.csv"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return leadApiError(error, 'Could not export leads')
  }
}
