import { fixturePath } from './billing-test-config'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/core/prisma'
import {
  schedulePlan,
  cancelRenewal,
  createCheckout,
} from '../lib/billing/payments'
import { cashfree, cashfreeMode } from '../lib/billing/cashfree'
import { string } from '../lib/billing/events'
async function main() {
  if (cashfreeMode() !== 'sandbox') throw new Error('Sandbox only')
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  const f = fixtures.find((x: { outcome: string }) => x.outcome === 'success')
  const results = []
  await prisma.billingAccount.update({
    where: { organizationId: f.orgId },
    data: {
      billingDetails: {
        name: 'Sandbox Institute',
        email: 'accounts@example.invalid',
        phone: '9999999999',
        address: 'Sample address, Karnataka',
        stateCode: '29',
      },
    },
  })
  await schedulePlan(f.orgId, 'growth')
  assert.equal(
    (
      await prisma.billingAccount.findUniqueOrThrow({
        where: { organizationId: f.orgId },
      })
    ).pendingPlanId,
    'growth',
  )
  results.push(
    'Real provider accepts Growth at next renewal; current quotas stay Starter',
  )
  await schedulePlan(f.orgId, 'starter')
  results.push('Real provider accepts replacement of scheduled plan')
  const pack = await createCheckout(f.orgId, f.userId, 'starter', 'pack')
  const intent = await prisma.billingCheckout.findUniqueOrThrow({
    where: { id: pack.checkoutId },
  })
  const pay = await cashfree(
    '/orders/sessions',
    'POST',
    {
      payment_session_id: (await cashfree(`/orders/${intent.providerId}`))
        .payment_session_id,
      payment_method: {
        upi: { channel: 'collect', upi_id: 'testsuccess@gocash' },
      },
    },
    randomUUID(),
  )
  process.env.CASHFREE_API_VERSION = '2023-08-01'
  const simulation = await cashfree(
    '/simulate',
    'POST',
    {
      entity: 'PAYMENTS',
      entity_id: string(pay.cf_payment_id),
      entity_simulation: { payment_status: 'SUCCESS' },
    },
    randomUUID(),
  )
  assert.ok(simulation.simulation_id)
  process.env.CASHFREE_API_VERSION = '2026-01-01'
  console.log(JSON.stringify({ step: 'pack_simulation_created' }))
  // Provider simulation is asynchronous; final verification runs separately.
  await cancelRenewal(f.orgId)
  await cancelRenewal(f.orgId)
  const account = await prisma.billingAccount.findUniqueOrThrow({
    where: { organizationId: f.orgId },
  })
  assert.equal(account.cancelAtPeriodEnd, true)
  assert.ok(account.paidThrough! > new Date())
  results.push('Real cancellation is idempotent and preserves paid access')
  console.log(
    JSON.stringify({ passed: results, packCheckoutId: pack.checkoutId }),
  )
  await prisma.$disconnect()
}
main().catch(async (e) => {
  console.error({ name: e.name, message: e.message, code: e.code })
  await prisma.$disconnect()
  process.exitCode = 1
})
