import { requestConfirmationError } from './request-rules'
import { OrganizationRole } from '@/lib/organization/roles'
import { z } from 'zod'
import type {
  followUpCreateSchema,
  followUpUpdateSchema,
} from '@/lib/organization/lead-schemas'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/core/prisma'
import { WorkflowError } from './workflow-error'

export function withLeadActor<T>(
  organizationId: string,
  userId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.actor_id', ${userId}, true)`
      // Verify the actor before any write, including standalone notes.
      if (
        !(await tx.organizationMembers.findFirst({
          where: {
            organizationId,
            userId,
            role: {
              in: [
                OrganizationRole.Owner,
                OrganizationRole.Admin,
                OrganizationRole.Counsellor,
              ],
            },
            user: { isActive: true, isBanned: false },
          },
          select: { id: true },
        }))
      )
        throw new WorkflowError(
          403,
          'You are not a member of this organization',
        )
      return work(tx)
    },
    { timeout: 20_000 },
  )
}

export async function lockedLead(
  tx: Prisma.TransactionClient,
  organizationId: string,
  leadId: string,
) {
  z.uuid().parse(leadId)
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM public.leads WHERE id=${leadId}::uuid AND organization_id=${organizationId} AND deleted_at IS NULL FOR UPDATE`
  if (!rows.length) throw new WorkflowError(404, 'Lead not found')
  return tx.leads.findUniqueOrThrow({ where: { id: leadId } })
}
async function validateCounsellor(
  tx: Prisma.TransactionClient,
  organizationId: string,
  id: string | null | undefined,
) {
  if (
    id &&
    !(await tx.organizationMembers.findFirst({
      where: {
        organizationId,
        userId: id,
        role: {
          in: [
            OrganizationRole.Owner,
            OrganizationRole.Admin,
            OrganizationRole.Counsellor,
          ],
        },
        user: { isActive: true, isBanned: false },
      },
      select: { id: true },
    }))
  )
    throw new WorkflowError(
      400,
      'Counsellor must be a member of this organization',
    )
}
export async function createFollowUp(
  organizationId: string,
  userId: string,
  leadId: string,
  body: z.infer<typeof followUpCreateSchema>,
) {
  return withLeadActor(organizationId, userId, async (tx) => {
    const lead = await lockedLead(tx, organizationId, leadId)
    const owner =
      body.counsellorId === undefined
        ? lead.assignedCounsellorId
        : body.counsellorId
    await validateCounsellor(tx, organizationId, owner)
    const status = body.status
    if (
      status === 'pending' &&
      ['lost', 'enrolled'].includes(lead.pipelineStage || '')
    )
      throw new WorkflowError(
        409,
        'Reopen the lead before scheduling more work.',
      )
    const stageOutcome =
      status === 'complete' &&
      ['application_started', 'enrolled', 'lost'].includes(body.outcome || '')
    if (stageOutcome && body.outcome === 'lost' && !body.lostReason?.trim())
      throw new WorkflowError(
        400,
        'Record a lost reason before completing this outcome.',
      )
    const task = await tx.leadFollowUps.create({
      data: {
        leadId,
        counsellorId: owner,
        followUpType: body.followUpType,
        status,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        completedAt: status === 'complete' ? new Date() : null,
        outcome: body.outcome,
        notes: body.notes,
      },
    })
    if (stageOutcome)
      await tx.leads.update({
        where: { id: leadId },
        data: {
          pipelineStage: body.outcome,
          lostReason: body.outcome === 'lost' ? body.lostReason : null,
          profileVersion: { increment: 1 },
        },
      })
    return task
  })
}
export async function updateFollowUp(
  organizationId: string,
  userId: string,
  leadId: string,
  taskId: string,
  body: z.infer<typeof followUpUpdateSchema>,
) {
  return withLeadActor(organizationId, userId, async (tx) => {
    const lead = await lockedLead(tx, organizationId, leadId)
    z.uuid().parse(taskId)
    const existing = await tx.leadFollowUps.findFirst({
      where: { id: taskId, leadId, deletedAt: null },
    })
    if (!existing) throw new WorkflowError(404, 'Follow-up not found')
    if (
      body.expectedUpdatedAt &&
      existing.updatedAt.toISOString() !==
        new Date(body.expectedUpdatedAt).toISOString()
    )
      throw new WorkflowError(
        409,
        'This follow-up changed. Refresh and review the latest details before saving.',
      )
    let status = body.status ?? existing.status ?? 'pending'
    const owner =
      body.counsellorId === undefined
        ? existing.counsellorId
        : body.counsellorId
    const type =
      body.followUpType === undefined
        ? existing.followUpType
        : body.followUpType
    const schedule =
      body.scheduledFor === undefined
        ? existing.scheduledFor
        : body.scheduledFor
          ? new Date(body.scheduledFor)
          : null
    await validateCounsellor(tx, organizationId, owner)
    if (
      existing.sourceRequestId &&
      ['cancelled', 'complete'].includes(existing.status || '') &&
      status === 'pending'
    )
      status = 'requested'
    if (
      status === 'pending' &&
      ['lost', 'enrolled'].includes(lead.pipelineStage || '')
    )
      throw new WorkflowError(
        409,
        'Reopen the lead before confirming more work.',
      )
    if (
      existing.status === 'requested' &&
      status === 'cancelled' &&
      !body.reviewReason?.trim()
    )
      throw new WorkflowError(400, 'Record why this request is being declined.')
    if (
      existing.status === 'requested' &&
      !['requested', 'cancelled'].includes(status)
    ) {
      if (status !== 'pending' || body.confirm !== true)
        throw new WorkflowError(
          400,
          'Review and explicitly confirm the request before completing it.',
        )
      if (!body.expectedUpdatedAt)
        throw new WorkflowError(400, 'Reload the request before confirming it.')
      const error = requestConfirmationError({
        consent: lead.consent_to_contact,
        email: lead.email,
        phone: lead.phone,
        type,
        owner,
        schedule,
      })
      if (error) throw new WorkflowError(400, error)
    }
    if (
      existing.sourceRequestId &&
      status === 'pending' &&
      lead.consent_to_contact !== true
    )
      throw new WorkflowError(
        400,
        'Contact consent is required for this request.',
      )
    const outcome = body.outcome === undefined ? existing.outcome : body.outcome
    const stageOutcome =
      status === 'complete' &&
      ['application_started', 'enrolled', 'lost'].includes(outcome || '') &&
      (existing.status !== 'complete' || outcome !== existing.outcome)
    if (stageOutcome && outcome === 'lost' && !body.lostReason?.trim())
      throw new WorkflowError(
        400,
        'Record a lost reason before completing this outcome.',
      )
    const task = await tx.leadFollowUps.update({
      where: { id: existing.id },
      data: {
        counsellorId: owner,
        followUpType: type,
        status,
        scheduledFor: schedule,
        completedAt:
          status === 'complete' ? existing.completedAt || new Date() : null,
        outcome: body.outcome,
        notes:
          existing.status === 'requested' && status === 'cancelled'
            ? [
                body.notes === undefined ? existing.notes : body.notes,
                `Review declined: ${body.reviewReason?.trim()}`,
              ]
                .filter(Boolean)
                .join('\n\n')
            : body.notes,
      },
    })
    if (stageOutcome)
      await tx.leads.update({
        where: { id: leadId },
        data: {
          pipelineStage: outcome,
          lostReason: outcome === 'lost' ? body.lostReason : null,
          profileVersion: { increment: 1 },
        },
      })
    return task
  })
}
