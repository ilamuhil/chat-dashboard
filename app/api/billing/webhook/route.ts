import { NextRequest, NextResponse } from 'next/server'
import { verifyCashfreeWebhook } from '@/lib/billing/cashfree'
import { processCashfreeEvent } from '@/lib/billing/payments'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 256000)
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  if (
    !verifyCashfreeWebhook(
      raw,
      request.headers.get('x-webhook-timestamp'),
      request.headers.get('x-webhook-signature'),
      process.env.CASHFREE_WEBHOOK_SECRET ||
        process.env.CASHFREE_CLIENT_SECRET ||
        '',
    )
  )
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 },
    )
  try {
    await processCashfreeEvent(JSON.parse(raw))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Event retained for reconciliation; please retry.' },
      { status: 500 },
    )
  }
}
