import { NextRequest, NextResponse } from 'next/server'
import {
  followUpUpdateSchema,
  leadApiError,
} from '@/lib/organization/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { lockedLead, updateFollowUp, withLeadActor } from '@/lib/leads/workflow'
export const runtime = 'nodejs'
type Context = { params: Promise<{ lead_id: string; follow_up_id: string }> }
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()
    const { lead_id, follow_up_id } = await params
    const body = followUpUpdateSchema.parse(await request.json())
    return NextResponse.json({
      followUp: await updateFollowUp(
        organizationId,
        userId,
        lead_id,
        follow_up_id,
        body,
      ),
    })
  } catch (error) {
    return leadApiError(error, 'Could not update follow-up')
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()
    const { lead_id, follow_up_id } = await params
    const result = await withLeadActor(organizationId, userId, async (tx) => {
      await lockedLead(tx, organizationId, lead_id)
      return tx.leadFollowUps.updateMany({
        where: { id: follow_up_id, leadId: lead_id, deletedAt: null },
        data: { deletedAt: new Date(), deletedById: userId },
      })
    })
    if (!result.count)
      return NextResponse.json(
        { error: 'Follow-up not found' },
        { status: 404 },
      )
    return NextResponse.json({ ok: true })
  } catch (error) {
    return leadApiError(error, 'Could not delete follow-up')
  }
}
