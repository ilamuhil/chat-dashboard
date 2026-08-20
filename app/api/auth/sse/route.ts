import { NextResponse } from 'next/server'
import { requireAuthUserId, corsHeaders } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { signSSEAuthToken } from '@/lib/auth-token'

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

  const token = signSSEAuthToken({ userId, orgId })

  return NextResponse.json({ token }, { headers: corsHeaders })
}
