import { NextRequest, NextResponse } from 'next/server'

import { followUpUpdateSchema, leadApiError } from '@/lib/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization-members'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ lead_id: string; follow_up_id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    const { lead_id: leadId, follow_up_id: followUpId } = await params
    const body = followUpUpdateSchema.parse(await request.json())

    const existingFollowUp = await prisma.leadFollowUps.findFirst({
      where: {
        id: followUpId,
        leadId,
        deletedAt: null,
        lead: { organizationId, deletedAt: null },
      },
      select: { id: true, completedAt: true },
    })

    if (!existingFollowUp) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 },
      )
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

    const completedAt =
      body.status === undefined
        ? undefined
        : body.status === 'complete'
          ? (existingFollowUp.completedAt ?? new Date())
          : null

    const followUp = await prisma.leadFollowUps.update({
      where: { id: existingFollowUp.id },
      data: {
        counsellorId: body.counsellorId,
        followUpType: body.followUpType,
        status: body.status,
        scheduledFor:
          body.scheduledFor === undefined
            ? undefined
            : body.scheduledFor === null
              ? null
              : new Date(body.scheduledFor),
        completedAt,
        outcome: body.outcome,
        notes: body.notes,
      },
    })

    return NextResponse.json({ followUp })
  } catch (error) {
    return leadApiError(error, 'Could not update follow-up')
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()
    const { lead_id: leadId, follow_up_id: followUpId } = await params
    const deletedAt = new Date()

    const result = await prisma.leadFollowUps.updateMany({
      where: {
        id: followUpId,
        leadId,
        deletedAt: null,
        lead: { organizationId, deletedAt: null },
      },
      data: { deletedAt, deletedById: userId },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ ok: true, followUpId })
  } catch (error) {
    return leadApiError(error, 'Could not delete follow-up')
  }
}
