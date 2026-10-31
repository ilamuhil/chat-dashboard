import { isAxiosError } from 'axios'
import { readOrganizationRole } from '@/lib/organization/organization-members'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { leadApiError } from '@/lib/organization/lead-schemas'
import { parseReportingWindow } from '@/lib/leads/analytics'
import { getSecretKey, signToken } from '@/lib/auth/jwt'
import { pythonApiRequest } from '@/lib/http/axios-server-config'
export async function GET(request: NextRequest) {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()
    const status = z
      .enum(['all', 'no_evidence', 'needs_clarification', 'unavailable'])
      .parse(request.nextUrl.searchParams.get('status') || 'all')
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(request.nextUrl.searchParams.get('page') || 1)
    let window
    try {
      window = parseReportingWindow(
        request.nextUrl.searchParams.get('from') || undefined,
        request.nextUrl.searchParams.get('to') || undefined,
      )
    } catch {
      return NextResponse.json(
        { error: 'Choose a valid reporting window.' },
        { status: 400 },
      )
    }
    const key = getSecretKey()
    if (!key)
      return NextResponse.json(
        { error: 'The chat reporting service is not configured.' },
        { status: 503 },
      )
    const token = signToken(
      {
        organization_id: organizationId,
        bot_id: '',
        type: 'dashboard_admin',
        organization_role: await readOrganizationRole(organizationId, userId),
        sub: userId,
      },
      key,
      '5m',
    )
    const query = new URLSearchParams({
      from_date: window.startAt.toISOString(),
      to_date: window.endAt.toISOString(),
      status,
      page: String(page),
    })
    const data = await pythonApiRequest(
      'GET',
      `/api/admissions/unanswered?${query}`,
      token,
    )
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (!isAxiosError(error))
      return leadApiError(error, 'Could not load question reporting')
    console.error(
      'Unanswered enquiry reporting unavailable',
      error instanceof Error ? error.message : 'Unknown error',
    )
    return NextResponse.json(
      {
        error:
          'Question reporting is temporarily unavailable. Lead analytics are still available.',
      },
      { status: 503 },
    )
  }
}
