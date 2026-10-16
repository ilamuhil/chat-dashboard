import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { maintainBilling } from '@/lib/billing/maintenance'
export const runtime = 'nodejs'
export const maxDuration = 300
export async function POST(request: NextRequest) {
  const provided = Buffer.from(request.headers.get('authorization') || '')
  const expected = Buffer.from(
    `Bearer ${process.env.BILLING_MAINTENANCE_SECRET || ''}`,
  )
  if (
    !process.env.BILLING_MAINTENANCE_SECRET ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    return NextResponse.json(await maintainBilling())
  } catch {
    return NextResponse.json(
      { error: 'Billing maintenance failed.' },
      { status: 500 },
    )
  }
}
