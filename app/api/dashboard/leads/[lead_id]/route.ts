import { NextRequest, NextResponse } from 'next/server'

import { leadApiError, leadUpdateSchema } from '@/lib/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization-members'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

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

    const profileKeys: Record<string, string> = {
      name: 'name', email: 'email', phone: 'phone', enquirerType: 'enquirer_type',
      studentName: 'student_name', studentAge: 'student_age', studentGender: 'student_gender',
      courseInterest: 'course_interest', educationLevel: 'education_level',
      preferredMode: 'preferred_mode', joiningTimeline: 'joining_timeline',
      joiningPreferenceDetails: 'joining_preference_details', consentToContact: 'consent_to_contact',
    }
    const metadata = JSON.parse(JSON.stringify(existingLead.profileMetadata)) as Record<string, Prisma.JsonValue>
    const previousValues = existingLead as unknown as Record<string, unknown>
    const nextValues = body as Record<string, unknown>
    const touched = Object.keys(body).filter(key => key in profileKeys &&
      nextValues[key] !== previousValues[key === 'consentToContact' ? 'consent_to_contact' : key])
      .map(key => profileKeys[key])
    const manualUpdatedAt = (metadata.manual_updated_at ?? {}) as Record<string, Prisma.JsonValue>
    for (const field of touched) manualUpdatedAt[field] = new Date().toISOString()
    metadata.manual_updated_at = manualUpdatedAt
    for (const key of ['field_evidence', 'declined_fields']) {
      const entries = (metadata[key] ?? {}) as Record<string, Prisma.JsonValue>
      for (const field of touched) delete entries[field]
      metadata[key] = entries
    }
    if (Array.isArray(metadata.unresolved_conflicts)) {
      metadata.unresolved_conflicts = metadata.unresolved_conflicts.filter(item =>
        typeof item !== 'object' || item === null || Array.isArray(item) || !touched.includes(String(item.field)))
    }
    const lead = await prisma.leads.update({
      where: { id: existingLead.id, organizationId, deletedAt: null, profileVersion: existingLead.profileVersion },
      data: {
        profileVersion: { increment: 1 },
        profileMetadata: metadata as Prisma.InputJsonValue,
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
        joiningPreferenceDetails: body.joiningPreferenceDetails,
        primaryIntent: body.primaryIntent,
        leadPriority: body.leadPriority,
        priorityReason: body.priorityReason,
        recommendedNextAction: body.recommendedNextAction,
        pipelineStage: body.pipelineStage,
        consent_to_contact: body.consentToContact,
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Lead changed while editing. Reload and try again.' }, { status: 409 })
    }
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
