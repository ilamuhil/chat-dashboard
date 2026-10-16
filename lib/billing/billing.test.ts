import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHmac, randomUUID } from 'node:crypto'
import {
  quote,
  nextMonth,
  PLANS,
  PLAN_VERSION,
  creditPackPrice,
} from './catalog'
import { verifyCashfreeWebhook } from './cashfree'
import { validCollection, normalizePayment } from './events'
import { prisma } from '../prisma'
import {
  ensureBilling,
  withBillingLock,
  assertCapacity,
  hasAccess,
} from './service'
import {
  applySubscriptionPayment,
  applyCreditPackPayment,
  applyRefund,
} from './payments'
import { gstBreakdown, invoiceAvailableAt } from './tax'

test('money is integer paise and monthly dates clamp at month end', () => {
  assert.deepEqual(quote(199900, 1800), {
    subtotalPaise: 199900,
    taxPaise: 35982,
    totalPaise: 235882,
    taxBps: 1800,
  })
  assert.equal(
    nextMonth(new Date('2028-01-31T12:00:00Z')).toISOString(),
    '2028-02-29T12:00:00.000Z',
  )
  assert.throws(() => quote(1, -1))
  assert.equal(creditPackPrice(1000), 69900)
  assert.equal(creditPackPrice(1500), 104900)
  assert.throws(() => creditPackPrice(999))
  assert.throws(() => creditPackPrice(1250))
})
test('GST components and invoice delay preserve exact paise', () => {
  const same = gstBreakdown(35982, 1800, '29', '29')
  assert.equal(same.cgstPaise, 17991)
  assert.equal(same.sgstPaise, 17991)
  assert.equal(same.igstPaise, 0)
  const different = gstBreakdown(35982, 1800, '29', '33')
  assert.equal(different.igstPaise, 35982)
  assert.equal(different.cgstPaise, 0)
  assert.equal(
    gstBreakdown(1, 1800, '04', '04').cgstPaise +
      gstBreakdown(1, 1800, '04', '04').utgstPaise,
    1,
  )
  assert.throws(() => gstBreakdown(1, 1800, '29', ''))
  assert.equal(
    invoiceAvailableAt('2026-10-16T00:00:00Z').toISOString(),
    '2026-10-23T00:00:00.000Z',
  )
})
test('webhooks require the raw payload, correct signature and fresh timestamp', () => {
  const now = Date.now()
  const timestamp = String(now)
  const raw = '{"payment_amount":1999.00}'
  const signature = createHmac('sha256', 'test-secret')
    .update(timestamp + raw)
    .digest('base64')
  assert.equal(
    verifyCashfreeWebhook(raw, timestamp, signature, 'test-secret', now),
    true,
  )
  assert.equal(
    verifyCashfreeWebhook(
      JSON.stringify(JSON.parse(raw)),
      timestamp,
      signature,
      'test-secret',
      now,
    ),
    false,
  )
  assert.equal(
    verifyCashfreeWebhook(
      raw,
      timestamp,
      signature,
      'test-secret',
      now + 600000,
    ),
    false,
  )
  assert.equal(
    verifyCashfreeWebhook(raw, timestamp, 'forged', 'test-secret', now),
    false,
  )
})
test('a refundable authorization or incorrect amount never grants paid access', () => {
  const fact = normalizePayment({
    payment_status: 'SUCCESS',
    payment_type: 'AUTH',
    payment_amount: 1999,
    payment_currency: 'INR',
    authorization_details: { authorization_amount_refund: true },
  })
  assert.equal(validCollection(fact, 199900), false)
  assert.equal(
    validCollection({ ...fact, authorizationRefund: false }, 199900),
    true,
  )
  assert.equal(validCollection({ ...fact, kind: 'CHARGE' }, 499900), false)
})

test(
  'development DB: trial identity, concurrent capacity, payment success/failure and idempotent renewal',
  { skip: process.env.RUN_BILLING_DB_TESTS !== '1' },
  async () => {
    const id = `billing-test-${randomUUID()}`
    const secondId = `${id}-second`
    const user = await prisma.users.create({
      data: { email: `${id}@example.invalid`, fullName: 'Billing Test' },
    })
    const otherUsers: string[] = []
    try {
      await prisma.organizations.create({
        data: {
          id,
          name: 'Billing integration test',
          organizationMembers: { create: { userId: user.id, role: 'admin' } },
        },
      })
      const trial = await withBillingLock(id, (tx) => ensureBilling(tx, id))
      assert.equal(trial.status, 'trialing')
      assert.equal(hasAccess(trial), true)
      await prisma.organizations.create({
        data: {
          id: secondId,
          organizationMembers: { create: { userId: user.id, role: 'admin' } },
        },
      })
      const duplicateTrial = await withBillingLock(secondId, (tx) =>
        ensureBilling(tx, secondId),
      )
      assert.equal(duplicateTrial.status, 'expired')
      await prisma.billingAccount.update({
        where: { organizationId: id },
        data: { limits: { ...PLANS.trial.limits, members: 2 } },
      })
      for (let i = 0; i < 2; i++)
        otherUsers.push(
          (
            await prisma.users.create({
              data: { email: `${id}-${i}@example.invalid` },
            })
          ).id,
        )
      const attempts = await Promise.allSettled(
        otherUsers.map((userId) =>
          withBillingLock(id, async (tx) => {
            await assertCapacity(tx, id, 'members')
            return tx.organizationMembers.create({
              data: { organizationId: id, userId, role: 'editor' },
            })
          }),
        ),
      )
      assert.equal(
        attempts.filter((result) => result.status === 'fulfilled').length,
        1,
      )
      const createdAt = new Date()
      const firstChargeAt = nextMonth(createdAt)
      const checkout = await prisma.billingCheckout.create({
        data: {
          organizationId: id,
          providerId: `sub_test_${randomUUID()}`,
          planId: 'starter',
          firstChargeAt,
          createdAt,
          expiresAt: new Date(Date.now() + 1800000),
          ...quote(PLANS.starter.pricePaise),
        },
      })
      const base = {
        subscription_id: checkout.providerId,
        cf_payment_id: 'failed-auth',
        payment_type: 'AUTH',
        payment_amount: 1999,
        payment_currency: 'INR',
        payment_status: 'FAILED',
        authorization_details: { authorization_amount_refund: false },
      }
      await applySubscriptionPayment(base)
      assert.equal(
        (
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          })
        ).planId,
        'trial',
      )
      await applySubscriptionPayment({
        ...base,
        cf_payment_id: 'refundable-auth',
        payment_status: 'SUCCESS',
        authorization_details: { authorization_amount_refund: true },
      })
      assert.equal(
        (
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          })
        ).planId,
        'trial',
      )
      const success = {
        ...base,
        cf_payment_id: 'auth-success',
        payment_status: 'SUCCESS',
      }
      await Promise.all([
        applySubscriptionPayment(success),
        applySubscriptionPayment(success),
      ])
      const paid = await prisma.billingAccount.findUniqueOrThrow({
        where: { organizationId: id },
      })
      assert.equal(paid.planId, 'starter')
      assert.equal(paid.status, 'active')
      const period = await prisma.billingPeriod.findUniqueOrThrow({
        where: { id: paid.currentPeriodId! },
      })
      assert.equal(period.replyLimit, 1000)
      assert.equal(period.planVersion, PLAN_VERSION)
      assert.equal(
        await prisma.billingPeriod.count({
          where: { organizationId: id, planId: 'starter' },
        }),
        1,
      )
      const renewal = {
        ...base,
        cf_payment_id: 'renewal-failed',
        payment_type: 'CHARGE',
        payment_schedule_date: firstChargeAt.toISOString(),
        payment_status: 'FAILED',
      }
      await applySubscriptionPayment(renewal)
      const failed = await prisma.billingAccount.findUniqueOrThrow({
        where: { organizationId: id },
      })
      assert.equal(failed.status, 'past_due')
      assert.equal(failed.currentPeriodId, paid.currentPeriodId)
      await applySubscriptionPayment({
        ...renewal,
        cf_payment_id: 'renewal-success',
        payment_status: 'SUCCESS',
      })
      await applySubscriptionPayment({
        ...renewal,
        cf_payment_id: 'same-cycle-retry',
        payment_status: 'SUCCESS',
      })
      const recovered = await prisma.billingAccount.findUniqueOrThrow({
        where: { organizationId: id },
      })
      assert.equal(recovered.status, 'active')
      assert.notEqual(recovered.currentPeriodId, paid.currentPeriodId)
      assert.equal(
        await prisma.billingPeriod.count({
          where: { organizationId: id, planId: 'starter' },
        }),
        2,
      )
      const replacementCheckout = await prisma.billingCheckout.create({
        data: {
          organizationId: id,
          providerId: `sub_replacement_${randomUUID()}`,
          planId: 'growth',
          firstChargeAt: nextMonth(new Date()),
          expiresAt: new Date(Date.now() + 1800000),
          ...quote(PLANS.growth.pricePaise),
        },
      })
      await applySubscriptionPayment({
        subscription_id: replacementCheckout.providerId,
        cf_payment_id: 'replacement-auth-failed',
        payment_type: 'AUTH',
        payment_amount: PLANS.growth.pricePaise / 100,
        payment_currency: 'INR',
        payment_status: 'FAILED',
        authorization_details: { authorization_amount_refund: false },
      })
      assert.equal(
        (
          await prisma.billingCheckout.findUniqueOrThrow({
            where: { id: replacementCheckout.id },
          })
        ).status,
        'failed',
      )
      assert.equal(
        (
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          })
        ).providerSubscriptionId,
        checkout.providerId,
      )
      await assert.rejects(
        applySubscriptionPayment({
          ...renewal,
          cf_payment_id: 'wrong-amount',
          payment_status: 'SUCCESS',
          payment_amount: 1,
        }),
      )
      assert.equal(
        (
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          })
        ).currentPeriodId,
        recovered.currentPeriodId,
      )
      const pack = await prisma.billingCheckout.create({
        data: {
          organizationId: id,
          kind: 'pack',
          providerId: `pack_test_${randomUUID()}`,
          planId: 'starter',
          firstChargeAt,
          expiresAt: firstChargeAt,
          ...quote(69900),
        },
      })
      const packPayment = {
        cf_payment_id: 'pack-success',
        payment_amount: 699,
        payment_currency: 'INR',
        payment_status: 'FAILED',
      }
      await applyCreditPackPayment(pack.id, id, packPayment)
      assert.equal(
        await prisma.billingCreditPack.count({ where: { organizationId: id } }),
        0,
      )
      await Promise.all([
        applyCreditPackPayment(pack.id, id, {
          ...packPayment,
          payment_status: 'SUCCESS',
        }),
        applyCreditPackPayment(pack.id, id, {
          ...packPayment,
          payment_status: 'SUCCESS',
          cf_payment_id: 'pack-duplicate-success',
        }),
      ])
      assert.equal(
        await prisma.billingCreditPack.count({ where: { organizationId: id } }),
        1,
      )
      const actualPack = await prisma.billingCreditPack.findFirstOrThrow({
        where: { organizationId: id },
      })
      assert.equal(actualPack.replies, 1000)
      const packLifetime =
        actualPack.expiresAt.getTime() -
        (
          await prisma.billingPayment.findUniqueOrThrow({
            where: { id: actualPack.id },
          })
        ).paidAt!.getTime()
      assert.equal(packLifetime, 90 * 86400000)
      const refundBase = {
        subscription_id: pack.providerId,
        cf_payment_id: actualPack.id.split(':').at(-1),
        refund_status: 'SUCCESS',
      }
      await applyRefund({
        ...refundBase,
        cf_refund_id: `partial-a-${id}`,
        refund_amount: 350,
      })
      await applyRefund({
        ...refundBase,
        cf_refund_id: `partial-a-${id}`,
        refund_amount: 350,
      })
      assert.equal(
        (
          await prisma.billingPayment.findUniqueOrThrow({
            where: { id: actualPack.id },
          })
        ).refundedPaise,
        35000,
      )
      assert.equal(
        (
          await prisma.billingCreditPack.findUniqueOrThrow({
            where: { id: actualPack.id },
          })
        ).revoked,
        false,
      )
      await applyRefund({
        ...refundBase,
        cf_refund_id: `partial-b-${id}`,
        refund_amount: 349,
      })
      assert.equal(
        (
          await prisma.billingCreditPack.findUniqueOrThrow({
            where: { id: actualPack.id },
          })
        ).revoked,
        true,
      )
      await applyRefund({
        subscription_id: checkout.providerId,
        cf_payment_id: 'auth-success',
        cf_refund_id: `older-cycle-${id}`,
        refund_status: 'SUCCESS',
        refund_amount: 1999,
      })
      assert.equal(
        (
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          })
        ).status,
        'active',
      )
      await applyRefund({
        subscription_id: checkout.providerId,
        cf_payment_id: 'renewal-success',
        cf_refund_id: `current-cycle-${id}`,
        refund_status: 'SUCCESS',
        refund_amount: 1999,
      })
      assert.equal(
        hasAccess(
          await prisma.billingAccount.findUniqueOrThrow({
            where: { organizationId: id },
          }),
        ),
        false,
      )
      await prisma.organizations.delete({ where: { id } })
      await prisma.organizations.create({
        data: {
          id,
          organizationMembers: { create: { userId: user.id, role: 'admin' } },
        },
      })
      assert.equal(
        (await withBillingLock(id, (tx) => ensureBilling(tx, id))).status,
        'expired',
      )
    } finally {
      await prisma.billingTrialClaim.deleteMany({
        where: { userId: { in: [user.id, ...otherUsers] } },
      })
      await prisma.organizations.deleteMany({
        where: { id: { in: [id, secondId] } },
      })
      await prisma.users.deleteMany({
        where: { id: { in: [user.id, ...otherUsers] } },
      })
      await prisma.$disconnect()
    }
  },
)
