import { NextRequest, NextResponse } from 'next/server'
import {
  followUpCreateSchema,
  leadApiError,
} from '@/lib/organization/lead-schemas'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { createFollowUp } from '@/lib/leads/workflow'
export const runtime = 'nodejs'
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lead_id: string }> },
) {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()
    const { lead_id } = await params
    const body = followUpCreateSchema.parse(await request.json())
    return NextResponse.json(
      { followUp: await createFollowUp(organizationId, userId, lead_id, body) },
      { status: 201 },
    )
  } catch (error) {
    return leadApiError(error, 'Could not create follow-up')
  }
}
