import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { billingActor } from '@/lib/billing/guards'
import {
  billingSummary,
  BillingError,
  jsonSafe,
  withBillingLock,
} from '@/lib/billing/service'
import {
  createCheckout,
  cancelRenewal,
  schedulePlan,
  reconcileCheckout,
  billingQuote,
  retryPayment,
} from '@/lib/billing/payments'
import { PLANS, CREDIT_PACK, quote } from '@/lib/billing/catalog'
import { record } from '@/lib/billing/events'
import { taxForCustomer } from '@/lib/billing/vendor'
import { billingDetailsSchema } from '@/lib/billing/details'
import {
  cashfree,
  cashfreeConfigured,
  cashfreeMode,
  CashfreeError,
} from '@/lib/billing/cashfree'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('checkout'),
    planId: z.enum(['starter', 'growth']),
    kind: z.enum(['subscription', 'pack']).default('subscription'),
  }),
  z.object({ action: z.literal('cancel') }),
  z.object({
    action: z.literal('change_plan'),
    planId: z.enum(['starter', 'growth']),
  }),
  z.object({
    action: z.literal('refresh'),
    checkoutId: z.string().uuid().optional(),
  }),
  z.object({ action: z.literal('abandon'), checkoutId: z.string().uuid() }),
  z.object({
    action: z.literal('retry'),
    paymentId: z.string().min(1).max(200),
  }),
])
function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || 'Invalid billing request.' },
      { status: 400 },
    )
  const status =
    error instanceof BillingError
      ? error.status
      : error instanceof CashfreeError
        ? 502
        : 503
  return NextResponse.json(
    {
      error:
        error instanceof BillingError || error instanceof CashfreeError
          ? error.message
          : 'Billing is temporarily unavailable. Please try again.',
    },
    { status },
  )
}
export async function GET(request: NextRequest) {
  try {
    const actor = await billingActor(request, false)
    const summary = await billingSummary(actor.organizationId)
    const canManage = actor.role === 'admin'
    const existingMandate =
      summary.account.providerSubscriptionId &&
      summary.account.paidThrough &&
      !summary.account.cancelAtPeriodEnd
        ? await prisma.billingCheckout.findUnique({
            where: { providerId: summary.account.providerSubscriptionId },
            select: { taxBps: true },
          })
        : null
    const displayQuote = (price: number, recurring = true) => {
      const value =
        recurring && existingMandate
          ? quote(price, existingMandate.taxBps)
          : billingQuote(price)
      let taxBreakdown = null
      try {
        taxBreakdown = taxForCustomer(
          value.taxPaise,
          value.taxBps,
          summary.account.billingDetails,
        )
      } catch {}
      return { ...value, taxBreakdown }
    }
    return NextResponse.json(
      jsonSafe({
        ...summary,
        checkouts: summary.checkouts.map(
          ({ billingSnapshot, ...checkout }) => ({
            ...checkout,
            taxBreakdown: record(billingSnapshot).taxBreakdown || null,
          }),
        ),
        payments: canManage ? summary.payments : [],
        account: {
          ...summary.account,
          billingDetails: canManage ? summary.account.billingDetails : {},
        },
        canManage,
        mode: cashfreeMode(),
        configured: cashfreeConfigured(),
        quotes: {
          starter: displayQuote(PLANS.starter.pricePaise),
          growth: displayQuote(PLANS.growth.pricePaise),
          pack: displayQuote(CREDIT_PACK.pricePaise, false),
        },
      }),
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await billingActor(request)
    const body = actionSchema.parse(await request.json())
    if (body.action === 'checkout')
      return NextResponse.json(
        await createCheckout(
          actor.organizationId,
          actor.userId,
          body.planId,
          body.kind,
        ),
      )
    if (body.action === 'cancel') await cancelRenewal(actor.organizationId)
    if (body.action === 'change_plan')
      await schedulePlan(actor.organizationId, body.planId)
    if (body.action === 'retry')
      await retryPayment(actor.organizationId, body.paymentId)
    if (body.action === 'refresh') {
      if (body.checkoutId) {
        await reconcileCheckout(body.checkoutId, actor.organizationId)
        const checkout = await prisma.billingCheckout.findFirst({
          where: { id: body.checkoutId, organizationId: actor.organizationId },
          select: { status: true },
        })
        return NextResponse.json({
          ok: true,
          checkoutStatus: checkout?.status,
        })
      } else {
        const checkouts = await prisma.billingCheckout.findMany({
          where: {
            organizationId: actor.organizationId,
            status: { notIn: ['cancelled', 'paid'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
        for (const checkout of checkouts)
          await reconcileCheckout(checkout.id, actor.organizationId)
      }
    }
    if (body.action === 'abandon') {
      const checkout = await prisma.billingCheckout.findFirst({
        where: {
          id: body.checkoutId,
          organizationId: actor.organizationId,
          status: { notIn: ['active', 'paid'] },
        },
      })
      if (!checkout) throw new BillingError('Pending checkout not found.', 404)
      if (
        checkout.kind === 'subscription' &&
        (checkout.status !== 'failed' || Boolean(checkout.sessionId))
      ) {
        try {
          await cashfree(
            `/subscriptions/${encodeURIComponent(checkout.providerId)}/manage`,
            'POST',
            { subscription_id: checkout.providerId, action: 'CANCEL' },
            checkout.id,
          )
        } catch (error) {
          if (!(
            error instanceof CashfreeError &&
            ['subscription_not_found', 'subscription_id_invalid'].includes(
              error.code,
            )
          ))
            throw error
        }
      }
      await prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: { status: 'cancelled' },
      })
      await prisma.billingAccount.updateMany({
        where: {
          organizationId: actor.organizationId,
          providerSubscriptionId: checkout.providerId,
          paidThrough: null,
        },
        data: { providerSubscriptionId: null, providerStatus: null },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const actor = await billingActor(request)
    const details = billingDetailsSchema.parse(await request.json())
    await withBillingLock(actor.organizationId, (tx) =>
      tx.billingAccount.update({
        where: { organizationId: actor.organizationId },
        data: { billingDetails: details },
      }),
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    return failure(error)
  }
}
