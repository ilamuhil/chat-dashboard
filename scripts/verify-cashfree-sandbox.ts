import { fixturePath } from './billing-test-config'
import { readFile } from 'node:fs/promises'
import { prisma } from '../lib/core/prisma'
import { reconcileCheckout } from '../lib/billing/payments'
import { cashfree } from '../lib/billing/cashfree'
import { record } from '../lib/billing/events'
async function main() {
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  for (const fixture of fixtures) {
    if (!fixture.checkout) continue
    await reconcileCheckout(fixture.checkout.checkoutId, fixture.orgId)
    const account = await prisma.billingAccount.findUniqueOrThrow({
      where: { organizationId: fixture.orgId },
    })
    const checkout = await prisma.billingCheckout.findUniqueOrThrow({
      where: { id: fixture.checkout.checkoutId },
    })
    const payments = await cashfree<unknown[]>(
      `/subscriptions/${checkout.providerId}/payments`,
    )
    console.log(
      JSON.stringify({
        outcome: fixture.outcome,
        plan: account.planId,
        status: account.status,
        providerStatus: account.providerStatus,
        payments: payments.map((p) => ({
          status: record(p).payment_status,
          type: record(p).payment_type,
          amount: record(p).payment_amount,
        })),
      }),
    )
  }
  await prisma.$disconnect()
}
main().catch(async (e) => {
  console.error({ error: e.name, code: e.code })
  await prisma.$disconnect()
  process.exitCode = 1
})
