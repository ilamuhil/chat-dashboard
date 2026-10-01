import { NextRequest, NextResponse } from 'next/server'

import { leadApiError, leadUpdateSchema } from '@/lib/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization-members'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ lead_id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    const { lead_id: leadId } = await params
    const body = leadUpdateSchema.parse(await request.json())

    const existingLead = await prisma.leads.findFirst({
      where: { id: leadId, organizationId, deletedAt: null },
      select: { id: true, email: true, phone: true },
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const nextEmail =
      body.email === undefined ? existingLead.email : body.email
    const nextPhone =
      body.phone === undefined ? existingLead.phone : body.phone

    if (!nextEmail && !nextPhone) {
      return NextResponse.json(
        { error: 'At least an email or phone number is required' },
        { status: 400 },
      )
    }

    const lead = await prisma.leads.update({
      where: { id: existingLead.id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        enquirerType: body.enquirerType,
        studentName: body.studentName,
        studentAge: body.studentAge,
        studentGender: body.studentGender,
        courseInterest: body.courseInterest,
        educationLevel: body.educationLevel,
        preferredMode: body.preferredMode,
        joiningTimeline: body.joiningTimeline,
        primaryIntent: body.primaryIntent,
        leadPriority: body.leadPriority,
        priorityReason: body.priorityReason,
        aiSummary: body.aiSummary,
        recommendedNextAction: body.recommendedNextAction,
        pipelineStage: body.pipelineStage,
        consent_to_contact: body.consentToContact,
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    return leadApiError(error, 'Could not update lead')
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, userId } =
      await requireOrganizationMembership('admin')
    const { lead_id: leadId } = await params
    const deletedAt = new Date()

    const result = await prisma.$transaction(async transaction => {
      const lead = await transaction.leads.updateMany({
        where: { id: leadId, organizationId, deletedAt: null },
        data: { deletedAt, deletedById: userId },
      })

      if (lead.count === 0) {
        return null
      }

      const followUps = await transaction.leadFollowUps.updateMany({
        where: { leadId, deletedAt: null },
        data: { deletedAt, deletedById: userId },
      })

      return { followUpsDeleted: followUps.count }
    })

    if (!result) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      leadId,
      followUpsDeleted: result.followUpsDeleted,
    })
  } catch (error) {
    return leadApiError(error, 'Could not delete lead')
  }
}
