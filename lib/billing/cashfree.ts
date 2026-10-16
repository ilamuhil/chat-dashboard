import { createHmac, timingSafeEqual } from 'node:crypto'

export class CashfreeError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(
      code === 'profile_inactive'
        ? 'Cashfree Subscriptions is not activated for this sandbox merchant yet. Ask the administrator to activate it in Cashfree.'
        : 'Cashfree could not complete this request. Please try again or contact support.',
    )
    this.name = 'CashfreeError'
  }
}
export function cashfreeConfigured() {
  return Boolean(
    process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET,
  )
}
export function cashfreeMode(): 'sandbox' | 'production' {
  const mode = process.env.CASHFREE_ENVIRONMENT || 'sandbox'
  if (mode !== 'sandbox' && mode !== 'production')
    throw new Error('Invalid Cashfree environment')
  if (mode === 'production' && process.env.BILLING_ALLOW_LIVE !== 'true')
    throw new Error('Live billing is not enabled')
  return mode
}
export async function cashfree<T = Record<string, unknown>>(
  path: string,
  method = 'GET',
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  if (!cashfreeConfigured())
    throw new Error(
      'Cashfree sandbox is not configured. Ask an administrator to add the test credentials.',
    )
  const mode = cashfreeMode()
  const response = await fetch(
    `${mode === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'}${path}`,
    {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': process.env.CASHFREE_API_VERSION || '2026-01-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
        ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
  )
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new CashfreeError(
      response.status,
      typeof error.code === 'string' ? error.code : 'provider_error',
    )
  }
  return response.json() as Promise<T>
}
export function verifyCashfreeWebhook(
  raw: string,
  timestamp: string | null,
  signature: string | null,
  secret: string,
  now = Date.now(),
) {
  if (!timestamp || !signature || !secret || !/^\d{10,16}$/.test(timestamp))
    return false
  const value = Number(timestamp)
  const milliseconds = value < 1e12 ? value * 1000 : value
  if (Math.abs(now - milliseconds) > 5 * 60_000) return false
  const expected = createHmac('sha256', secret)
    .update(timestamp + raw)
    .digest()
  const received = Buffer.from(signature, 'base64')
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}
