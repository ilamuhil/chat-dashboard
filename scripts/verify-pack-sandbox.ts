import { fixturePath } from './billing-test-config'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prisma } from '../lib/core/prisma'
import { reconcileCheckout } from '../lib/billing/payments'
async function main() {
  const f = JSON.parse(await readFile(fixturePath, 'utf8')).find(
    (x: { outcome: string }) => x.outcome === 'success',
  )
  const checkouts = await prisma.billingCheckout.findMany({
    where: { organizationId: f.orgId, kind: 'pack' },
  })
  for (const c of checkouts) await reconcileCheckout(c.id, f.orgId)
  const packs = await prisma.billingCreditPack.findMany({
    where: { organizationId: f.orgId },
  })
  assert.equal(packs.length, 1)
  assert.equal(packs[0].replies, 1000)
  await reconcileCheckout(checkouts[0].id, f.orgId)
  assert.equal(
    await prisma.billingCreditPack.count({
      where: { organizationId: f.orgId },
    }),
    1,
  )
  console.log({
    passed: [
      'Real Cashfree one-time pack success grants 1,000 expiring replies exactly once',
    ],
    packs: packs.length,
  })
  await prisma.$disconnect()
}
main().catch(async (e) => {
  console.error({ name: e.name, code: e.code, message: e.message })
  await prisma.$disconnect()
  process.exitCode = 1
})
