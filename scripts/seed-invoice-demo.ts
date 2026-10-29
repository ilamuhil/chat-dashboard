import { prisma } from '../lib/core/prisma'
import { cashfreeMode } from '../lib/billing/cashfree'
import { quote, nextMonth } from '../lib/billing/catalog'
import { SAMPLE_VENDOR } from '../lib/billing/vendor'
import { gstBreakdown } from '../lib/billing/tax'

async function main() {
  if (cashfreeMode() !== 'sandbox')
    throw new Error('Sample invoices are only available in sandbox.')
  const orgId = process.argv[2]
  if (!orgId) throw new Error('Pass the development organization ID.')
  const org = await prisma.organizations.findUniqueOrThrow({
    where: { id: orgId },
  })
  const entries = [
    {
      key: 'starter',
      planId: 'starter',
      price: 199900,
      days: 40,
      buyerState: '33',
      label: 'Starter monthly subscription',
    },
    {
      key: 'growth',
      planId: 'growth',
      price: 499900,
      days: 8,
      buyerState: '29',
      label: 'Growth monthly subscription',
    },
    {
      key: 'pack',
      planId: 'starter',
      price: 69900,
      days: 2,
      buyerState: '33',
      label: '1,000 extra AI replies',
    },
  ]
  for (const entry of entries) {
    const id = `invoice-demo:${orgId}:${entry.key}`
    if (await prisma.billingPayment.findUnique({ where: { id } })) continue
    const paidAt = new Date(Date.now() - entry.days * 86400000)
    const values = quote(entry.price, 1800)
    await prisma.$transaction(async (tx) => {
      const checkout = await tx.billingCheckout.create({
        data: {
          organizationId: orgId,
          kind: entry.key === 'pack' ? 'pack' : 'subscription',
          status: 'paid',
          planId: entry.planId,
          providerId: id,
          firstChargeAt: paidAt,
          expiresAt: paidAt,
          ...values,
          billingSnapshot: { demo: true, sandbox: true },
        },
      })
      await tx.billingPayment.create({
        data: {
          id,
          organizationId: orgId,
          checkoutId: checkout.id,
          kind: entry.key === 'pack' ? 'pack' : 'AUTH',
          status: 'SUCCESS',
          amountPaise: values.totalPaise,
          paidAt,
          receiptNumber: 'SAMPLE-' + entry.key.toUpperCase(),
          snapshot: {
            ...values,
            demo: true,
            sandbox: true,
            planName: entry.label,
            billingDetails: {
              name: (org.name || 'Sample Institute') + ' (sample)',
              email: 'accounts@example.invalid',
              phone: '9999999999',
              address:
                entry.buyerState === '33'
                  ? '45 Sample Education Road, Chennai, Tamil Nadu 600001, India'
                  : '45 Sample Education Road, Bengaluru, Karnataka 560001, India',
              stateCode: entry.buyerState,
              gstin: entry.buyerState + 'ABCDE1234F1Z5',
            },
            seller: SAMPLE_VENDOR,
            taxBreakdown: gstBreakdown(
              values.taxPaise,
              values.taxBps,
              SAMPLE_VENDOR.stateCode,
              entry.buyerState,
            ),
            ...(entry.key === 'pack'
              ? {}
              : {
                  period: {
                    startsAt: paidAt.toISOString(),
                    endsAt: nextMonth(paidAt).toISOString(),
                  },
                }),
          },
        },
      })
    })
  }
  console.log(
    JSON.stringify({
      sampleInvoices: 3,
      downloadableNow: 2,
      waitingForSevenDays: 1,
      planOrAllowanceChanged: false,
    }),
  )
}
void main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
