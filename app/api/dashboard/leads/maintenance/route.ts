import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { maintainLeadWorkflow } from '@/lib/leads/alerts'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: NextRequest) {
  const secret =
    process.env.LEAD_WORKFLOW_MAINTENANCE_SECRET ||
    process.env.BILLING_MAINTENANCE_SECRET
  const provided = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(`Bearer ${secret || ''}`)
  if (
    !secret ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await maintainLeadWorkflow())
  } catch (error) {
    console.error('Lead workflow maintenance failed', error)
    return NextResponse.json(
      { error: 'Lead workflow maintenance failed' },
      { status: 500 },
    )
  }
}
