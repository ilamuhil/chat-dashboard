import { createHash } from 'node:crypto'
export type PaymentFact = {
  id: string
  subscriptionId: string
  kind: string
  status: string
  amountPaise: number
  currency: string
  scheduledAt: Date | null
  paidAt: Date
  failure: string | null
  authorizationRefund: boolean
  refundPaise: number
  refundId: string | null
}
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}
export function string(value: unknown) {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}
export function paymentStatus(value: unknown) {
  const status = string(value).toUpperCase()
  return status === 'CUSTOMER_CANCELLED' ? 'USER_DROPPED' : status
}
export function providerDate(value: unknown): Date | null {
  const raw = string(value)
  if (!raw) return null
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T00:00:00+05:30`
    : /(?:Z|[+-]\d{2}:\d{2})$/.test(raw)
      ? raw
      : `${raw}+05:30`
  const parsed = new Date(normalized)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}
export function normalizePayment(
  value: unknown,
  eventTime?: unknown,
): PaymentFact {
  const data = record(value)
  const subscription = record(data.subscription_details)
  const auth = record(data.authorization_details)
  const amount = Number(data.payment_amount)
  return {
    id: string(data.cf_payment_id || data.payment_id),
    subscriptionId: string(
      data.subscription_id || subscription.subscription_id,
    ),
    kind: string(data.payment_type),
    status: paymentStatus(data.payment_status),
    amountPaise: Number.isFinite(amount) ? Math.round(amount * 100) : -1,
    currency: string(data.payment_currency || 'INR'),
    scheduledAt: providerDate(data.payment_schedule_date),
    paidAt:
      providerDate(
        eventTime ||
          data.payment_completion_date ||
          data.payment_initiated_date,
      ) || new Date(),
    failure: string(record(data.failure_details).failure_reason) || null,
    authorizationRefund: auth.authorization_amount_refund === true,
    refundPaise: Math.round(Number(data.refund_amount || 0) * 100),
    refundId: string(data.cf_refund_id || data.refund_id) || null,
  }
}
export function eventId(payload: unknown) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
export function validCollection(fact: PaymentFact, expected: number) {
  return (
    fact.status === 'SUCCESS' &&
    fact.currency === 'INR' &&
    fact.amountPaise === expected &&
    (fact.kind === 'CHARGE' ||
      (fact.kind === 'AUTH' && !fact.authorizationRefund))
  )
}
