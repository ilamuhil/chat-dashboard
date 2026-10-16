import { prisma } from '../lib/prisma'
import { ensureBilling, withBillingLock } from '../lib/billing/service'
async function main() {
  const organizations = await prisma.organizations.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  for (const org of organizations)
    await withBillingLock(org.id, (tx) => ensureBilling(tx, org.id))
  console.log(
    `Initialized billing for ${organizations.length} existing organizations. No existing app records were removed.`,
  )
  await prisma.$disconnect()
}
main().catch(() => {
  console.error('Billing initialization failed.')
  process.exitCode = 1
})
