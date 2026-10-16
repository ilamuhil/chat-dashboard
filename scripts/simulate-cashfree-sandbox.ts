import { fixturePath } from './billing-test-config'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma'
import { cashfree, cashfreeMode } from '../lib/billing/cashfree'
import { record, string } from '../lib/billing/events'
async function main() {
  if (cashfreeMode() !== 'sandbox') throw new Error('Sandbox only')
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  for (const f of fixtures) {
    if (!f.checkout) continue
    const c = await prisma.billingCheckout.findUniqueOrThrow({
      where: { id: f.checkout.checkoutId },
    })
    const payments = await cashfree<unknown[]>(
      `/subscriptions/${c.providerId}/payments`,
    )
    const auth = payments
      .map(record)
      .find((p) => p.payment_type === 'AUTH' && p.payment_status === 'PENDING')
    if (!auth) continue
    process.env.CASHFREE_API_VERSION = '2023-08-01'
    try {
      const result = await cashfree(
        '/simulate',
        'POST',
        {
          entity: 'SUBS_PAYMENTS',
          entity_id: string(auth.payment_id),
          entity_simulation: {
            payment_status: f.outcome === 'success' ? 'SUCCESS' : 'FAILED',
            ...(f.outcome === 'failure'
              ? { payment_error_code: 'ISSUER_NOT_AVAILABLE' }
              : {}),
          },
        },
        randomUUID(),
      )
      console.log(
        JSON.stringify({
          outcome: f.outcome,
          simulationStatus: record(result).entity_simulation,
          simulationCreated: Boolean(result.simulation_id),
        }),
      )
    } catch (e) {
      console.log(
        JSON.stringify({
          outcome: f.outcome,
          error: e instanceof Error ? e.name : 'Error',
          code: record(e).code,
          status: record(e).status,
        }),
      )
    }
    process.env.CASHFREE_API_VERSION = '2026-01-01'
  }
  await prisma.$disconnect()
}
main().catch(async (e) => {
  console.error({ name: e.name, code: e.code })
  await prisma.$disconnect()
  process.exitCode = 1
})
