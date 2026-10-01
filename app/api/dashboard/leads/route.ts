import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organization-members'
import {
  bulkLeadDeleteSchema,
  leadApiError,
  manualLeadCreateSchema,
} from '@/lib/lead-schemas'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    const body = manualLeadCreateSchema.parse(await request.json())

    const lead = await prisma.leads.create({
      data: {
        organizationId,
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

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    return leadApiError(error, 'Could not create lead')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { organizationId, userId } =
      await requireOrganizationMembership('admin')
    const { leadIds } = bulkLeadDeleteSchema.parse(await request.json())
    const deletedAt = new Date()

    const result = await prisma.$transaction(async transaction => {
      const activeLeads = await transaction.leads.findMany({
        where: {
          id: { in: leadIds },
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      })
      const activeLeadIds = activeLeads.map(lead => lead.id)

      if (activeLeadIds.length === 0) {
        return { leadsDeleted: 0, followUpsDeleted: 0 }
      }

      const leads = await transaction.leads.updateMany({
        where: {
          id: { in: activeLeadIds },
          organizationId,
          deletedAt: null,
        },
        data: { deletedAt, deletedById: userId },
      })
      const followUps = await transaction.leadFollowUps.updateMany({
        where: {
          leadId: { in: activeLeadIds },
          deletedAt: null,
        },
        data: { deletedAt, deletedById: userId },
      })

      return {
        leadsDeleted: leads.count,
        followUpsDeleted: followUps.count,
      }
    })

    return NextResponse.json({
      ok: true,
      ...result,
      notFound: leadIds.length - result.leadsDeleted,
    })
  } catch (error) {
    return leadApiError(error, 'Could not delete leads')
  }
}
