import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import {
  requireOrganizationMembership,
  requireOrganizationPermission,
} from '@/lib/organization/organization-members'
import { canEditLeadNote, noteEditVersion } from '@/lib/leads/note-permissions'
import { leadApiError } from '@/lib/organization/lead-schemas'
import { lockedLead, withLeadActor } from '@/lib/leads/workflow'
import { WorkflowError } from '@/lib/leads/workflow-error'
const noteSchema = z
  .object({
    id: z.uuid(),
    body: z.string().trim().min(1, 'Write a note before saving.').max(10000),
  })
  .strict()
type Context = { params: Promise<{ lead_id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    const { lead_id } = await params
    z.uuid().parse(lead_id)
    const cursor = z
      .uuid()
      .optional()
      .parse(request.nextUrl.searchParams.get('cursor') || undefined)
    if (
      !(await prisma.leads.findFirst({
        where: { id: lead_id, organizationId, deletedAt: null },
        select: { id: true },
      }))
    )
      throw new WorkflowError(404, 'Lead not found')
    if (
      cursor &&
      !(await prisma.leadActivities.findFirst({
        where: { id: cursor, leadId: lead_id, organizationId },
        select: { id: true },
      }))
    )
      throw new WorkflowError(400, 'Invalid activity cursor')
    const rows = await prisma.leadActivities.findMany({
      where: { leadId: lead_id, organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 31,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    return NextResponse.json(
      {
        activities: rows.slice(0, 30),
        nextCursor: rows.length > 30 ? rows[29].id : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return leadApiError(error, 'Could not load activity')
  }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { organizationId, userId } =
      await requireOrganizationPermission('operate')
    const { lead_id } = await params
    z.uuid().parse(lead_id)
    const body = noteSchema.parse(await request.json())
    const note = await withLeadActor(organizationId, userId, async (tx) => {
      await lockedLead(tx, organizationId, lead_id)
      const existing = await tx.leadActivities.findUnique({
        where: { id: body.id },
      })
      if (existing) {
        if (
          existing.organizationId !== organizationId ||
          existing.leadId !== lead_id ||
          existing.actorId !== userId ||
          existing.kind !== 'note' ||
          existing.body !== body.body
        )
          throw new WorkflowError(
            409,
            'This note request was already used. Start a new note.',
          )
        return existing
      }
      const actor = await tx.users.findUniqueOrThrow({
        where: { id: userId },
        select: { fullName: true, email: true },
      })
      return tx.leadActivities.create({
        data: {
          id: body.id,
          leadId: lead_id,
          organizationId,
          actorId: userId,
          actorLabel: actor.fullName || actor.email || 'Organization member',
          kind: 'note',
          body: body.body,
        },
      })
    })
    return NextResponse.json({ activity: note }, { status: 201 })
  } catch (error) {
    return leadApiError(error, 'Could not save internal note')
  }
}

const editSchema = z
  .object({
    id: z.uuid(),
    body: z.string().trim().min(1, 'Write a note before saving.').max(10000),
    expectedVersion: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER - 1),
  })
  .strict()

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { organizationId, userId } =
      await requireOrganizationPermission('operate')
    const { lead_id } = await params
    z.uuid().parse(lead_id)
    const body = editSchema.parse(await request.json())
    const result = await withLeadActor(organizationId, userId, async (tx) => {
      await lockedLead(tx, organizationId, lead_id)
      const note = await tx.leadActivities.findFirst({
        where: { id: body.id, leadId: lead_id, organizationId, kind: 'note' },
      })
      if (!note) throw new WorkflowError(404, 'Internal note not found')
      const membership = await tx.organizationMembers.findFirstOrThrow({
        where: { organizationId, userId },
        select: { role: true },
      })
      if (!canEditLeadNote(membership.role, userId, note.actorId))
        throw new WorkflowError(
          403,
          'You can only edit your own internal notes.',
        )
      // Retrying an already-saved edit must not create duplicate history entries.
      if (note.body === body.body) return { activity: note, audit: null }
      const details =
        note.details &&
        typeof note.details === 'object' &&
        !Array.isArray(note.details)
          ? note.details
          : {}
      const version = noteEditVersion(details)
      if (version !== body.expectedVersion)
        throw new WorkflowError(
          409,
          'This note was edited by someone else. Refresh the activity before editing it again. Your draft has been kept.',
        )
      const actor = await tx.users.findUniqueOrThrow({
        where: { id: userId },
        select: { fullName: true, email: true },
      })
      const actorLabel = actor.fullName || actor.email || 'Organization member'
      const editedAt = new Date().toISOString()
      const activity = await tx.leadActivities.update({
        where: { id: note.id },
        data: {
          body: body.body,
          details: {
            ...details,
            editVersion: version + 1,
            editedAt,
            editedByLabel: actorLabel,
          },
        },
      })
      const audit = await tx.leadActivities.create({
        data: {
          leadId: lead_id,
          organizationId,
          actorId: userId,
          actorLabel,
          kind: 'note_edited',
          body: 'Internal note edited',
          details: {
            noteId: note.id,
            changes: { note_body: { from: note.body, to: body.body } },
          },
        },
      })
      return { activity, audit }
    })
    return NextResponse.json(result)
  } catch (error) {
    return leadApiError(error, 'Could not update internal note')
  }
}
