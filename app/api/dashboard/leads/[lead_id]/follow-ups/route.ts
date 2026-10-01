import { NextRequest, NextResponse } from 'next/server'

import { followUpCreateSchema, leadApiError } from '@/lib/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization-members'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ lead_id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    const { lead_id: leadId } = await params
    const body = followUpCreateSchema.parse(await request.json())

    const lead = await prisma.leads.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
      select: { id: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (body.counsellorId) {
      const counsellor = await prisma.organizationMembers.findFirst({
        where: { organizationId, userId: body.counsellorId },
        select: { id: true },
      })

      if (!counsellor) {
        return NextResponse.json(
          { error: 'Counsellor must be a member of this organization' },
          { status: 400 },
        )
      }
    }

    const followUp = await prisma.leadFollowUps.create({
      data: {
        leadId: lead.id,
        counsellorId: body.counsellorId,
        followUpType: body.followUpType,
        status: body.status,
        scheduledFor: body.scheduledFor
          ? new Date(body.scheduledFor)
          : body.scheduledFor,
        completedAt: body.status === 'complete' ? new Date() : null,
        outcome: body.outcome,
        notes: body.notes,
      },
    })

    return NextResponse.json({ followUp }, { status: 201 })
  } catch (error) {
    return leadApiError(error, 'Could not create follow-up')
  }
}
