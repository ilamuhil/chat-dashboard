import { randomUUID, createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { cashfree, cashfreeMode, CashfreeError } from './cashfree'
import {
  PLANS,
  PLAN_VERSION,
  CREDIT_PACK,
  isPaidPlan,
  nextMonth,
  quote,
} from './catalog'
import {
  BillingError,
  ensureBilling,
  hasAccess,
  withBillingLock,
} from './service'
import {
  eventId,
  normalizePayment,
  record,
  string,
  providerDate,
  validCollection,
} from './events'
import { billingVendor, taxForCustomer, customerState } from './vendor'
import { billingDetailsSchema } from './details'

function appUrl() {
  const url = process.env.APP_URL || 'http://localhost:4000'
  return url.replace(/\/$/, '')
}
export function billingQuote(price: number) {
  const tax = process.env.BILLING_TAX_BPS
  if (cashfreeMode() === 'production' && tax === undefined)
    throw new BillingError(
      'Billing tax configuration is required before live checkout.',
      503,
    )
  return quote(price, Number(tax || 0))
}
export async function createCheckout(
  orgId: string,
  userId: string,
  planId: 'starter' | 'growth',
  kind: 'subscription' | 'pack' = 'subscription',
) {
  const mode = cashfreeMode()
  const customer = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, phone: true },
  })
  const organization = await prisma.organizations.findUnique({
    where: { id: orgId },
  })
  const account = await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
  const parsedDetails = billingDetailsSchema.safeParse(account.billingDetails)
  if (!parsedDetails.success)
    throw new BillingError(
      'Complete your billing name, email, phone, address and state on Billing & invoices before payment.',
      400,
      'billing_details_required',
    )
  const details = parsedDetails.data
  try {
    customerState(details)
  } catch (error) {
    throw new BillingError(
      error instanceof Error
        ? error.message
        : 'Select your billing state before checkout.',
      400,
    )
  }
  const phone = string(details.phone || organization?.phone || customer?.phone)
    .replace(/\D/g, '')
    .slice(-10)
  const email = string(details.email || organization?.email || customer?.email)
  if (!/^\d{10}$/.test(phone) || !email.includes('@'))
    throw new BillingError(
      'Add a billing email and a 10-digit Indian phone number before checkout.',
      400,
    )
  const checkout = await withBillingLock(orgId, async (tx) => {
    const current = await ensureBilling(tx, orgId)
    if (kind === 'pack' && (!hasAccess(current) || current.planId === 'trial'))
      throw new BillingError('Credit packs require an active paid plan.', 402)
    if (
      kind === 'subscription' &&
      current.providerSubscriptionId &&
      current.paidThrough &&
      !current.cancelAtPeriodEnd
    )
      throw new BillingError(
        'You already have a subscription. Use Change plan or Cancel renewal.',
        409,
      )
    if (
      kind === 'subscription' &&
      current.cancelAtPeriodEnd &&
      current.paidThrough &&
      current.paidThrough > new Date()
    )
      throw new BillingError(
        'Your paid access continues until the displayed date. Start a new subscription after it ends to avoid paying for overlapping periods.',
        409,
      )
    const existing = await tx.billingCheckout.findFirst({
      where: {
        organizationId: orgId,
        kind,
        OR: [
          { status: { in: ['creating', 'ready', 'authorized'] } },
          { status: 'failed', sessionId: { not: null } },
        ],
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      if (existing.planId !== planId)
        throw new BillingError(
          'Finish or cancel your pending checkout before choosing another plan.',
        )
      return existing
    }
    const id = randomUUID()
    return tx.billingCheckout.create({
      data: {
        id,
        organizationId: orgId,
        planId,
        kind,
        providerId: `${kind === 'pack' ? 'pack' : 'sub'}_${id.replaceAll('-', '')}`,
        ...billingQuote(
          kind === 'pack' ? CREDIT_PACK.pricePaise : PLANS[planId].pricePaise,
        ),
        firstChargeAt: nextMonth(new Date()),
        billingSnapshot: {
          billingDetails: current.billingDetails,
          seller: billingVendor(),
          taxBreakdown: taxForCustomer(
            billingQuote(
              kind === 'pack'
                ? CREDIT_PACK.pricePaise
                : PLANS[planId].pricePaise,
            ).taxPaise,
            billingQuote(
              kind === 'pack'
                ? CREDIT_PACK.pricePaise
                : PLANS[planId].pricePaise,
            ).taxBps,
            current.billingDetails,
          ),
        },
        expiresAt: new Date(Date.now() + 30 * 60000),
      },
    })
  })
  if (checkout.sessionId && kind === 'pack') {
    const order = await cashfree(
      `/orders/${encodeURIComponent(checkout.providerId)}`,
    )
    const freshSession = string(order.payment_session_id)
    if (freshSession) {
      await prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: { sessionId: freshSession },
      })
      return { checkoutId: checkout.id, sessionId: freshSession, kind, mode }
    }
  }
  if (checkout.sessionId)
    return {
      checkoutId: checkout.id,
      sessionId: checkout.sessionId,
      kind,
      mode,
    }
  const returnUrl = `${appUrl()}/api/billing/return?checkout=${checkout.id}`
  try {
    const result =
      kind === 'pack'
        ? await cashfree(
            '/orders',
            'POST',
            {
              order_id: checkout.providerId,
              order_amount: checkout.totalPaise / 100,
              order_currency: 'INR',
              customer_details: {
                customer_id: userId,
                customer_name:
                  customer?.fullName || organization?.name || 'Customer',
                customer_email: email,
                customer_phone: phone,
              },
              order_meta: {
                return_url: `${appUrl()}/dashboard/subscription?checkout=${checkout.id}`,
              },
            },
            checkout.id,
          )
        : await cashfree(
            '/subscriptions',
            'POST',
            {
              subscription_id: checkout.providerId,
              customer_details: {
                customer_name:
                  customer?.fullName || organization?.name || 'Customer',
                customer_email: email,
                customer_phone: phone,
              },
              plan_details: {
                plan_name: `${PLANS[planId].name} monthly`,
                plan_type: 'PERIODIC',
                plan_currency: 'INR',
                plan_amount: checkout.totalPaise / 100,
                plan_max_amount:
                  quote(PLANS.growth.pricePaise, checkout.taxBps).totalPaise /
                  100,
                plan_max_cycles: 120,
                plan_intervals: 1,
                plan_interval_type: 'MONTH',
              },
              authorization_details: {
                authorization_amount: checkout.totalPaise / 100,
                authorization_amount_refund: false,
                payment_methods: ['upi', 'card'],
              },
              subscription_meta: {
                return_url: returnUrl,
                session_id_expiry: checkout.expiresAt.toISOString(),
              },
              subscription_first_charge_time:
                checkout.firstChargeAt.toISOString(),
              subscription_expiry_time: new Date(
                Date.now() + 10 * 366 * 86400000,
              ).toISOString(),
              subscription_tags: {
                organization_id: orgId,
                plan_id: planId,
                plan_version: PLAN_VERSION,
              },
            },
            checkout.id,
          )
    const sessionId = string(
      result.subscription_session_id || result.payment_session_id,
    )
    if (!sessionId)
      throw new BillingError(
        'Cashfree did not return a checkout session. Use Refresh payment status before retrying.',
        502,
      )
    await prisma.billingCheckout.update({
      where: { id: checkout.id },
      data: { sessionId, status: 'ready' },
    })
    return { checkoutId: checkout.id, sessionId, kind, mode }
  } catch (error) {
    if (
      error instanceof CashfreeError &&
      error.status >= 400 &&
      error.status < 500 &&
      error.status !== 409 &&
      error.status !== 429
    )
      await prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: { status: 'failed' },
      })
    // Keep the intent and idempotency key after a timeout: a provider may have
    // accepted it even though its response did not reach us.
    throw error
  }
}

export async function applySubscriptionPayment(
  data: unknown,
  eventTime?: unknown,
) {
  const fact = normalizePayment(data, eventTime)
  if (!fact.subscriptionId || !fact.id) return
  const checkout = await prisma.billingCheckout.findUnique({
    where: { providerId: fact.subscriptionId },
  })
  if (!checkout || checkout.kind !== 'subscription') return
  await withBillingLock(checkout.organizationId, async (tx) => {
    const account = await ensureBilling(tx, checkout.organizationId)
    const paymentId = `${fact.subscriptionId}:${fact.id}`
    const existing = await tx.billingPayment.findUnique({
      where: { id: paymentId },
    })
    if (existing?.status === 'SUCCESS' || existing?.status === 'REFUNDED')
      return
    const renewal = fact.kind === 'CHARGE'
    const scheduled = fact.scheduledAt
    let selectedPlan =
      account.providerSubscriptionId === fact.subscriptionId &&
      isPaidPlan(account.planId)
        ? account.planId
        : checkout.planId
    if (
      renewal &&
      isPaidPlan(account.pendingPlanId) &&
      (!account.paidThrough ||
        (scheduled &&
          scheduled.getTime() >= account.paidThrough.getTime() - 86400000))
    )
      selectedPlan = account.pendingPlanId
    if (!isPaidPlan(selectedPlan))
      throw new BillingError('Unknown subscription plan.', 422)
    const expected = quote(PLANS[selectedPlan].pricePaise, checkout.taxBps)
    if (
      fact.status === 'SUCCESS' &&
      !validCollection(fact, expected.totalPaise)
    ) {
      // A refundable mandate authorization is not a subscription collection.
      if (fact.kind === 'AUTH') return
      throw new BillingError(
        'Payment amount or currency does not match this subscription.',
        422,
      )
    }
    if (
      !['SUCCESS', 'FAILED', 'CANCELLED', 'PENDING', 'INITIALIZED'].includes(
        fact.status,
      )
    )
      return
    const savedBilling = record(checkout.billingSnapshot)
    const receiptBuyer = renewal
      ? account.billingDetails
      : savedBilling.billingDetails || account.billingDetails
    const snapshot = {
      ...expected,
      providerPaymentId: string(record(data).payment_id),
      planId: selectedPlan,
      planName: PLANS[selectedPlan].name,
      billingDetails: receiptBuyer,
      seller: renewal
        ? billingVendor()
        : savedBilling.seller || billingVendor(),
      taxBreakdown:
        !renewal && savedBilling.taxBreakdown
          ? savedBilling.taxBreakdown
          : taxForCustomer(expected.taxPaise, checkout.taxBps, receiptBuyer),
      sandbox: cashfreeMode() === 'sandbox',
    }
    await tx.billingPayment.upsert({
      where: { id: paymentId },
      create: {
        id: paymentId,
        organizationId: checkout.organizationId,
        providerSubscriptionId: fact.subscriptionId,
        checkoutId: checkout.id,
        kind: fact.kind,
        status: fact.status,
        amountPaise: fact.amountPaise,
        scheduledAt: scheduled,
        paidAt: fact.status === 'SUCCESS' ? fact.paidAt : null,
        failureReason: fact.failure,
        receiptNumber: fact.status === 'SUCCESS' ? `RCPT-${fact.id}` : null,
        snapshot,
      },
      update: {
        status: fact.status,
        paidAt: fact.status === 'SUCCESS' ? fact.paidAt : null,
        failureReason: fact.failure,
        receiptNumber: fact.status === 'SUCCESS' ? `RCPT-${fact.id}` : null,
        snapshot,
      },
    })
    if (fact.status === 'FAILED') {
      if (
        renewal &&
        account.paidThrough &&
        scheduled &&
        scheduled.getTime() >= account.paidThrough.getTime() - 86400000
      )
        await tx.billingAccount.update({
          where: { organizationId: checkout.organizationId },
          data: {
            status: 'past_due',
            graceUntil: new Date(account.paidThrough.getTime() + 3 * 86400000),
          },
        })
      await tx.billingCheckout.update({
        where: { id: checkout.id },
        data: { status: renewal || account.paidThrough ? 'active' : 'failed' },
      })
      return
    }
    if (fact.status !== 'SUCCESS') return
    if (
      account.providerSubscriptionId &&
      account.providerSubscriptionId !== fact.subscriptionId &&
      hasAccess(account)
    )
      throw new BillingError(
        'A different subscription is already active for this organization.',
        409,
      )
    const startsAt = renewal ? scheduled : checkout.createdAt
    if (!startsAt)
      throw new BillingError(
        'Recurring payment is missing its schedule date.',
        422,
      )
    // One entitlement grant per charge cycle, even when provider retries use
    // different transaction IDs. Failed events can never downgrade a paid cycle.
    const duplicate = await tx.billingPeriod.findFirst({
      where: {
        organizationId: checkout.organizationId,
        startsAt,
        planId: { not: 'trial' },
      },
    })
    if (duplicate) return
    const endsAt = renewal ? nextMonth(startsAt) : checkout.firstChargeAt
    let graceUsed = 0
    if (
      account.currentPeriodId &&
      account.paidThrough &&
      startsAt >= new Date(account.paidThrough.getTime() - 86400000)
    ) {
      graceUsed = await tx.billingUsage.count({
        where: {
          organizationId: checkout.organizationId,
          periodId: account.currentPeriodId,
          kind: 'reply',
          status: 'completed',
          createdAt: { gte: account.paidThrough },
        },
      })
    }
    const period = await tx.billingPeriod.create({
      data: {
        organizationId: checkout.organizationId,
        planId: selectedPlan,
        planVersion: PLAN_VERSION,
        startsAt,
        endsAt,
        replyLimit: PLANS[selectedPlan].limits.replies,
        repliesUsed: graceUsed,
        trainingLimit: PLANS[selectedPlan].limits.trainingTokens,
        paymentId,
      },
    })
    if (!account.paidThrough || endsAt > account.paidThrough)
      await tx.billingAccount.update({
        where: { organizationId: checkout.organizationId },
        data: {
          planId: selectedPlan,
          planVersion: PLAN_VERSION,
          limits: PLANS[selectedPlan].limits,
          currentPeriodId: period.id,
          paidThrough: endsAt,
          graceUntil: null,
          status: 'active',
          providerSubscriptionId: fact.subscriptionId,
          cancelAtPeriodEnd:
            account.providerSubscriptionId === fact.subscriptionId
              ? account.cancelAtPeriodEnd
              : false,
          pendingPlanId: null,
        },
      })
    await tx.billingCheckout.update({
      where: { id: checkout.id },
      data: { status: 'active' },
    })
  })
}

export async function processCashfreeEvent(
  payload: unknown,
  storedId?: string,
) {
  const event = record(payload)
  const data = record(event.data)
  const type = string(event.type)
  const details = record(data.subscription_details)
  const providerId = string(
    data.subscription_id ||
      details.subscription_id ||
      record(data.order).order_id,
  )
  const id = storedId || eventId(payload)
  const saved = await prisma.billingEvent.upsert({
    where: { id },
    create: {
      id,
      eventType: type,
      providerId,
      payload: {
        type,
        data: sanitizeEventData(data),
        event_time: string(event.event_time),
      } as Prisma.InputJsonValue,
    },
    update: {},
  })
  if (saved.processedAt) return
  try {
    if (
      type === 'SUBSCRIPTION_PAYMENT_SUCCESS' ||
      type === 'SUBSCRIPTION_PAYMENT_FAILED' ||
      type === 'SUBSCRIPTION_PAYMENT_CANCELLED'
    )
      await applySubscriptionPayment(data, event.event_time)
    else if (
      type === 'SUBSCRIPTION_STATUS_CHANGED' ||
      type === 'SUBSCRIPTION_AUTH_STATUS'
    ) {
      const checkout = await prisma.billingCheckout.findUnique({
        where: { providerId },
      })
      if (checkout)
        await withBillingLock(checkout.organizationId, async (tx) => {
          const account = await ensureBilling(tx, checkout.organizationId)
          const at = providerDate(event.event_time) || new Date()
          const status = string(
            details.subscription_status ||
              data.subscription_status ||
              record(data.authorization_details).authorization_status ||
              data.payment_status,
          )
          await tx.billingCheckout.update({
            where: { id: checkout.id },
            data: {
              status: [
                'CANCELLED',
                'CUSTOMER_CANCELLED',
                'LINK_EXPIRED',
                'FAILED',
              ].includes(status)
                ? 'cancelled'
                : checkout.status === 'active'
                  ? 'active'
                  : status === 'ACTIVE'
                    ? 'authorized'
                    : checkout.status,
            },
          })
          if (
            (!account.providerSubscriptionId ||
              account.providerSubscriptionId === providerId) &&
            (!account.providerUpdatedAt || at >= account.providerUpdatedAt)
          )
            await tx.billingAccount.update({
              where: { organizationId: checkout.organizationId },
              data: {
                providerSubscriptionId: providerId,
                providerStatus: status,
                providerUpdatedAt: at,
                ...([
                  'CANCELLED',
                  'CUSTOMER_CANCELLED',
                  'EXPIRED',
                  'COMPLETED',
                ].includes(status)
                  ? { cancelAtPeriodEnd: true }
                  : {}),
              },
            })
        })
    } else if (
      type === 'SUBSCRIPTION_REFUND_STATUS' ||
      type === 'REFUND_STATUS_WEBHOOK'
    )
      await applyRefund(data)
    else if (type.startsWith('PAYMENT_')) {
      const checkout = await prisma.billingCheckout.findUnique({
        where: { providerId },
      })
      if (checkout?.kind === 'pack')
        await reconcileCheckout(checkout.id, checkout.organizationId)
    }
    await prisma.billingEvent.update({
      where: { id },
      data: { processedAt: new Date(), error: null },
    })
  } catch (error) {
    await prisma.billingEvent.update({
      where: { id },
      data: {
        error:
          error instanceof BillingError
            ? error.message
            : 'Processing failed; reconciliation required.',
      },
    })
    throw error
  }
}
function sanitizeEventData(data: Record<string, unknown>) {
  const keys = [
    'subscription_id',
    'cf_payment_id',
    'payment_id',
    'payment_type',
    'payment_amount',
    'payment_currency',
    'payment_status',
    'payment_schedule_date',
    'payment_initiated_date',
    'refund_amount',
    'refund_status',
    'refund_id',
    'cf_refund_id',
  ]
  const result: Record<string, unknown> = Object.fromEntries(
    keys.filter((k) => data[k] !== undefined).map((k) => [k, data[k]]),
  )
  const sub = record(data.subscription_details)
  result.subscription_details = {
    subscription_id: string(sub.subscription_id),
    subscription_status: string(sub.subscription_status),
  }
  const auth = record(data.authorization_details)
  result.authorization_details = {
    authorization_status: string(auth.authorization_status),
    authorization_amount_refund: auth.authorization_amount_refund === true,
  }
  if (data.refund)
    result.refund = Object.fromEntries(
      keys
        .filter((k) => record(data.refund)[k] !== undefined)
        .map((k) => [k, record(data.refund)[k]]),
    )
  if (data.order)
    result.order = { order_id: string(record(data.order).order_id) }
  return result
}

export async function applyRefund(value: unknown) {
  const data = record(value)
  const refund = Object.keys(record(data.refund)).length
    ? record(data.refund)
    : data
  if (string(refund.refund_status) !== 'SUCCESS') return
  const cfId = string(refund.cf_payment_id || data.cf_payment_id)
  const providerId = string(data.subscription_id || record(data.order).order_id)
  const refundId = string(refund.cf_refund_id || refund.refund_id)
  if (!cfId || !refundId)
    throw new BillingError('Refund is missing its provider identifiers.', 422)
  // Cashfree subscription refund webhooks omit subscription_id. Its payment
  // identifier is globally unique; require exactly one known payment match.
  const matches = await prisma.billingPayment.findMany({
    where: {
      id: providerId ? `${providerId}:${cfId}` : { endsWith: `:${cfId}` },
    },
    take: 2,
  })
  if (matches.length > 1)
    throw new BillingError('Refund payment identity is ambiguous.', 422)
  const payment = matches[0]
  if (!payment) return
  const amountPaise = Math.round(Number(refund.refund_amount) * 100)
  if (
    !Number.isSafeInteger(amountPaise) ||
    amountPaise <= 0 ||
    amountPaise > payment.amountPaise
  )
    throw new BillingError('Invalid refund amount.', 422)
  await withBillingLock(payment.organizationId, async (tx) => {
    const id = `cashfree:${refundId}`
    const existing = await tx.billingRefund.findUnique({ where: { id } })
    if (
      existing &&
      (existing.paymentId !== payment.id ||
        existing.amountPaise !== amountPaise)
    )
      throw new BillingError(
        'Refund identity does not match the recorded transaction.',
        422,
      )
    await tx.billingRefund.upsert({
      where: { id },
      create: { id, paymentId: payment.id, amountPaise },
      update: {},
    })
    const total = await tx.billingRefund.aggregate({
      where: { paymentId: payment.id },
      _sum: { amountPaise: true },
    })
    const refunded = total._sum.amountPaise || 0
    if (refunded > payment.amountPaise)
      throw new BillingError('Refund total exceeds the original payment.', 422)
    await tx.billingPayment.update({
      where: { id: payment.id },
      data: {
        refundedPaise: refunded,
        status: refunded >= payment.amountPaise ? 'REFUNDED' : payment.status,
      },
    })
    if (refunded >= payment.amountPaise) {
      await tx.billingCreditPack.updateMany({
        where: { id: payment.id },
        data: { revoked: true },
      })
      const period = await tx.billingPeriod.findUnique({
        where: { paymentId: payment.id },
      })
      const account = await ensureBilling(tx, payment.organizationId)
      if (period && account.currentPeriodId === period.id)
        await tx.billingAccount.update({
          where: { organizationId: payment.organizationId },
          data: {
            paidThrough: new Date(),
            graceUntil: null,
            status: 'refunded',
          },
        })
    }
  })
}

export async function applyCreditPackPayment(
  checkoutId: string,
  orgId: string,
  raw: unknown,
) {
  const checkout = await prisma.billingCheckout.findFirst({
    where: { id: checkoutId, organizationId: orgId, kind: 'pack' },
  })
  if (!checkout) throw new BillingError('Credit pack checkout not found.', 404)
  const item = record(raw)
  const status = string(item.payment_status)
  const cfId = string(item.cf_payment_id)
  if (!cfId || !['SUCCESS', 'FAILED', 'CANCELLED', 'PENDING'].includes(status))
    return
  if (
    Math.round(Number(item.payment_amount) * 100) !== checkout.totalPaise ||
    item.payment_currency !== 'INR'
  )
    throw new BillingError('Credit pack payment does not match its order.', 422)
  const id = `${checkout.providerId}:${cfId}`
  await withBillingLock(orgId, async (tx) => {
    if (
      await tx.billingPayment.findFirst({
        where: { checkoutId, status: { in: ['SUCCESS', 'REFUNDED'] } },
      })
    )
      return
    const account = await ensureBilling(tx, orgId)
    const paidAt =
      status === 'SUCCESS'
        ? providerDate(item.payment_time) || new Date()
        : null
    const values = {
      status,
      paidAt,
      receiptNumber: status === 'SUCCESS' ? `RCPT-${cfId}` : null,
      failureReason:
        string(record(item.error_details).error_description) || null,
    }
    await tx.billingPayment.upsert({
      where: { id },
      create: {
        id,
        organizationId: orgId,
        checkoutId,
        kind: 'pack',
        amountPaise: checkout.totalPaise,
        ...values,
        snapshot: {
          subtotalPaise: checkout.subtotalPaise,
          taxPaise: checkout.taxPaise,
          totalPaise: checkout.totalPaise,
          planName: '1,000 AI replies',
          billingDetails:
            record(checkout.billingSnapshot).billingDetails ||
            account.billingDetails,
          seller: record(checkout.billingSnapshot).seller || billingVendor(),
          taxBreakdown:
            record(checkout.billingSnapshot).taxBreakdown ||
            taxForCustomer(
              checkout.taxPaise,
              checkout.taxBps,
              account.billingDetails,
            ),
          taxBps: checkout.taxBps,
          sandbox: cashfreeMode() === 'sandbox',
        },
      },
      update: values,
    })
    if (paidAt) {
      await tx.billingCreditPack.create({
        data: {
          id,
          organizationId: orgId,
          replies: CREDIT_PACK.replies,
          expiresAt: new Date(
            paidAt.getTime() + CREDIT_PACK.expiryDays * 86400000,
          ),
        },
      })
      await tx.billingCheckout.update({
        where: { id: checkoutId },
        data: { status: 'paid' },
      })
    }
  })
}

export async function reconcileCheckout(checkoutId: string, orgId: string) {
  const checkout = await prisma.billingCheckout.findFirst({
    where: { id: checkoutId, organizationId: orgId },
  })
  if (!checkout) throw new BillingError('Checkout not found.', 404)
  if (checkout.kind === 'pack') {
    const payments = await cashfree<unknown[]>(
      `/orders/${encodeURIComponent(checkout.providerId)}/payments`,
    )
    for (const raw of payments)
      await applyCreditPackPayment(checkout.id, orgId, raw)
  } else {
    const subscription = await cashfree(
      `/subscriptions/${encodeURIComponent(checkout.providerId)}`,
    )
    await processCashfreeEvent({
      type: 'SUBSCRIPTION_STATUS_CHANGED',
      event_time: new Date().toISOString(),
      data: {
        subscription_details: {
          subscription_id: checkout.providerId,
          subscription_status: subscription.subscription_status,
        },
      },
    })
    const result = await cashfree<unknown>(
      `/subscriptions/${encodeURIComponent(checkout.providerId)}/payments`,
    )
    const payments = Array.isArray(result) ? result : record(result).payments
    if (Array.isArray(payments))
      for (const payment of payments)
        await applySubscriptionPayment({
          ...record(payment),
          subscription_id: checkout.providerId,
        })
  }
  if (checkout.kind !== 'pack') return
  const refunds = await cashfree<unknown>(
    `/orders/${encodeURIComponent(checkout.providerId)}/refunds`,
  )
  const items = Array.isArray(refunds) ? refunds : record(refunds).refunds
  if (Array.isArray(items))
    for (const refund of items) {
      const value = record(refund)
      const successful = await prisma.billingPayment.findMany({
        where: {
          checkoutId: checkout.id,
          status: { in: ['SUCCESS', 'REFUNDED'] },
        },
      })
      const matching =
        successful.find(
          (payment) =>
            string(record(payment.snapshot).providerPaymentId) ===
            string(value.payment_id),
        ) ||
        (checkout.kind === 'pack' && successful.length === 1
          ? successful[0]
          : null)
      await applyRefund({
        ...value,
        subscription_id: checkout.providerId,
        cf_payment_id: value.cf_payment_id || matching?.id.split(':').at(-1),
      })
    }
}

export async function cancelRenewal(orgId: string) {
  const account = await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
  if (!account.providerSubscriptionId)
    throw new BillingError('There is no recurring mandate to cancel.', 400)
  if (!account.cancelAtPeriodEnd)
    await cashfree(
      `/subscriptions/${encodeURIComponent(account.providerSubscriptionId)}/manage`,
      'POST',
      { subscription_id: account.providerSubscriptionId, action: 'CANCEL' },
      randomUUID(),
    )
  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: {
      cancelAtPeriodEnd: true,
      pendingPlanId: null,
      providerStatus: 'CANCELLED',
    },
  })
  await prisma.billingCheckout.updateMany({
    where: { providerId: account.providerSubscriptionId },
    data: { status: 'cancelled' },
  })
}

export async function retryPayment(orgId: string, id: string) {
  const payment = await prisma.billingPayment.findFirst({
    where: { id, organizationId: orgId, kind: 'CHARGE', status: 'FAILED' },
  })
  const account = await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
  if (
    !payment ||
    !payment.providerSubscriptionId ||
    account.providerSubscriptionId !== payment.providerSubscriptionId ||
    account.cancelAtPeriodEnd ||
    account.status !== 'past_due'
  )
    throw new BillingError(
      'There is no failed renewal available to retry.',
      409,
    )
  const paymentId = string(record(payment.snapshot).providerPaymentId)
  if (!paymentId)
    throw new BillingError(
      'Refresh the payment status before retrying this renewal.',
      409,
    )
  // Repeated clicks reuse a provider idempotency key and schedule. Cashfree
  // performs collection only after its required pre-debit notification.
  const noticeId = `retry:${payment.id}`
  const intent = await prisma.billingNotice.upsert({
    where: { id: noticeId },
    create: { id: noticeId, organizationId: orgId, kind: 'payment_retry' },
    update: {},
  })
  if (intent.sentAt) return
  const digest = createHash('sha256').update(noticeId).digest('hex')
  const key = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`
  await cashfree(
    `/subscriptions/${encodeURIComponent(payment.providerSubscriptionId)}/payments/${encodeURIComponent(paymentId)}/manage`,
    'POST',
    {
      subscription_id: payment.providerSubscriptionId,
      payment_id: paymentId,
      action: 'RETRY',
      action_details: {
        next_scheduled_time: new Date(
          intent.createdAt.getTime() + 2 * 86400000,
        ).toISOString(),
      },
    },
    key,
  )
  await prisma.billingNotice.update({
    where: { id: noticeId },
    data: { sentAt: new Date() },
  })
}

export async function schedulePlan(
  orgId: string,
  planId: 'starter' | 'growth',
) {
  const account = await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
  if (
    !account.providerSubscriptionId ||
    !account.paidThrough ||
    account.cancelAtPeriodEnd
  )
    throw new BillingError(
      'Start a subscription before changing the renewal plan.',
      400,
    )
  if (account.paidThrough.getTime() - Date.now() < 2 * 86400000)
    throw new BillingError(
      'Your next payment is already being prepared. Change the plan after this renewal or contact support.',
    )
  const checkout = await prisma.billingCheckout.findUnique({
    where: { providerId: account.providerSubscriptionId },
  })
  if (!checkout) throw new BillingError('Subscription checkout not found.', 404)
  const total = quote(PLANS[planId].pricePaise, checkout.taxBps).totalPaise
  await withBillingLock(orgId, async (tx) => {
    const [bots, members, files, corpus, sources, invites, oversize] =
      await Promise.all([
        tx.bots.count({ where: { organizationId: orgId, deletedAt: null } }),
        tx.organizationMembers.count({ where: { organizationId: orgId } }),
        tx.files.aggregate({
          where: { organizationId: orgId, deletedAt: null },
          _sum: { sizeBytes: true },
        }),
        tx.$queryRaw<
          { tokens: bigint }[]
        >`SELECT coalesce(sum(b.tokens+b.pending_tokens),0)::bigint AS tokens FROM billing_source_usage b JOIN training_sources s ON s.id=b.source_id WHERE b.organization_id=${orgId} AND s.deleted_at IS NULL`,
        tx.trainingSources.count({
          where: { organizationId: orgId, deletedAt: null },
        }),
        tx.organizationInvites.count({
          where: {
            organizationId: orgId,
            acceptedAt: null,
            createdAt: { gt: new Date(Date.now() - 14 * 86400000) },
          },
        }),
        tx.files.count({
          where: {
            organizationId: orgId,
            deletedAt: null,
            sizeBytes: { gt: PLANS[planId].limits.fileBytes },
          },
        }),
      ])
    const limits = PLANS[planId].limits
    if (
      bots > limits.bots ||
      members + invites > limits.members ||
      Number(files._sum.sizeBytes || 0) > limits.storageBytes ||
      Number(corpus[0]?.tokens || 0) > limits.corpusTokens ||
      sources > limits.sources ||
      oversize > 0
    )
      throw new BillingError(
        'Reduce your bots, members or stored training content to the new plan’s limits before scheduling this change. Your existing data has not been changed.',
      )
  })
  const providerPlan = `plan_${planId}_${checkout.taxBps}_${PLAN_VERSION}`
  try {
    await cashfree('/plans', 'POST', {
      plan_id: providerPlan,
      plan_name: `${PLANS[planId].name} monthly`,
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_recurring_amount: total / 100,
      plan_max_amount: total / 100,
      plan_max_cycles: 120,
      plan_intervals: 1,
      plan_interval_type: 'MONTH',
    })
  } catch (error) {
    const { CashfreeError } = await import('./cashfree')
    if (!(
      error instanceof CashfreeError &&
      (error.status === 409 || error.code === 'plan_already_exists')
    ))
      throw error
  }
  // Cashfree applies the new recurring plan to the next collection; the app
  // grants its quotas only after that amount has actually been collected.
  await cashfree(
    `/subscriptions/${encodeURIComponent(account.providerSubscriptionId)}/manage`,
    'POST',
    {
      subscription_id: account.providerSubscriptionId,
      action: 'CHANGE_PLAN',
      action_details: { plan_id: providerPlan },
    },
    randomUUID(),
  )
  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: { pendingPlanId: planId },
  })
}
