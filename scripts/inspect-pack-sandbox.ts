import { fixturePath } from './billing-test-config'
import { readFile } from 'node:fs/promises'
import { prisma } from '../lib/core/prisma'
import { cashfree } from '../lib/billing/cashfree'
async function main() {
  const f = JSON.parse(await readFile(fixturePath, 'utf8')).find(
    (x: { outcome: string }) => x.outcome === 'success',
  )
  const c = await prisma.billingCheckout.findFirstOrThrow({
    where: { organizationId: f.orgId, kind: 'pack' },
    orderBy: { createdAt: 'desc' },
  })
  const order = await cashfree(`/orders/${c.providerId}`)
  console.log({
    status: order.order_status,
    currency: order.order_currency,
    amount: order.order_amount,
    sessionMatches: order.payment_session_id === c.sessionId,
    sessionType: typeof order.payment_session_id,
    sessionLength: c.sessionId?.length,
  })
  await prisma.$disconnect()
}
main().catch(async (e) => {
  console.error({ name: e.name, code: e.code })
  await prisma.$disconnect()
})
