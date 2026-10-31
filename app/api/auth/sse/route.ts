import { readOrganizationRole } from '@/lib/organization/organization-members'
import { NextResponse } from 'next/server'
import { requireAuthUserId, corsHeaders } from '@/lib/auth/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/organization/current-organization'
import { signSSEAuthToken } from '@/lib/auth/auth-token'

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET() {
  const userId = await requireAuthUserId()
  const orgId = await resolveCurrentOrganizationId({ userId })

  if (!orgId) {
    return NextResponse.json(
      { error: 'No organization selected' },
      { status: 400, headers: corsHeaders },
    )
  }

  const token = signSSEAuthToken({
    userId,
    orgId,
    role: await readOrganizationRole(orgId, userId),
  })

  return NextResponse.json({ token }, { headers: corsHeaders })
}
