import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { leadApiError } from '@/lib/organization/lead-schemas'
import {
  loadAdmissionsReport,
  parseReportingWindow,
} from '@/lib/leads/analytics'
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await requireOrganizationMembership()
    let window
    try {
      window = parseReportingWindow(
        request.nextUrl.searchParams.get('from') || undefined,
        request.nextUrl.searchParams.get('to') || undefined,
      )
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof z.ZodError
              ? 'Enter valid report dates.'
              : error instanceof Error
                ? error.message
                : 'Invalid report window',
        },
        { status: 400 },
      )
    }
    return NextResponse.json(
      await loadAdmissionsReport(organizationId, window),
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return leadApiError(error, 'Could not load admissions analytics')
  }
}
