import { fixturePath } from './billing-test-config'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { prisma } from '../lib/core/prisma'
import { createCheckout, reconcileCheckout } from '../lib/billing/payments'
import { cashfree, cashfreeMode } from '../lib/billing/cashfree'
import { signAuthToken } from '../lib/auth/auth-token'
import { record, string } from '../lib/billing/events'
import { ensureBilling, withBillingLock } from '../lib/billing/service'

async function main() {
  if (cashfreeMode() !== 'sandbox')
    throw new Error('This script only runs against Cashfree sandbox.')
  const run = randomUUID().replaceAll('-', '')
  const fixtures = []
  for (const outcome of ['success', 'failure']) {
    const orgId = `sandbox-billing-${outcome}-${run}`
    const user = await prisma.users.create({
      data: {
        email: `${outcome}-${run}@example.invalid`,
        fullName: 'Sandbox Billing Test',
        phone: '9999999999',
        emailVerified: true,
        onboardingCompleted: true,
      },
    })
    await prisma.organizations.create({
      data: {
        id: orgId,
        name: `Sandbox billing ${outcome}`,
        email: user.email,
        phone: '9999999999',
        organizationMembers: { create: { userId: user.id, role: 'admin' } },
      },
    })
    const fixture = {
      outcome,
      orgId,
      userId: user.id,
      checkout: null as Awaited<ReturnType<typeof createCheckout>> | null,
      authToken: signAuthToken({ userId: user.id }, '2h'),
    }
    fixtures.push(fixture)
    await writeFile(fixturePath, JSON.stringify(fixtures), { mode: 0o600 })
    await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
    await prisma.billingAccount.update({
      where: { organizationId: orgId },
      data: {
        billingDetails: {
          name: 'Sandbox Billing Test',
          email: user.email,
          phone: '9999999999',
          address: 'Sample address, Chennai, Tamil Nadu, India',
          stateCode: '33',
          gstin: '',
        },
      },
    })
    const checkout = await createCheckout(orgId, user.id, 'starter')
    fixture.checkout = checkout
    await writeFile(fixturePath, JSON.stringify(fixtures), { mode: 0o600 })
    console.log(
      JSON.stringify({
        outcome,
        step: 'checkout_created',
        mode: checkout.mode,
      }),
    )
    try {
      const intent = await prisma.billingCheckout.findUniqueOrThrow({
        where: { id: checkout.checkoutId },
      })
      const auth = await cashfree(
        '/subscriptions/pay',
        'POST',
        {
          subscription_id: intent.providerId,
          subscription_session_id: checkout.sessionId,
          payment_id: `auth_${randomUUID().replaceAll('-', '')}`,
          payment_type: 'AUTH',
          payment_method: {
            upi: {
              channel: 'collect',
              upi_id:
                outcome === 'success'
                  ? 'testsuccess@gocash'
                  : 'testfailure@gocash',
            },
          },
        },
        randomUUID(),
      )
      console.log(
        JSON.stringify({
          outcome,
          step: 'authorization_attempt',
          status: string(auth.payment_status),
          type: string(auth.payment_type),
        }),
      )
      await reconcileCheckout(checkout.checkoutId, orgId)
      const account = await prisma.billingAccount.findUniqueOrThrow({
        where: { organizationId: orgId },
      })
      console.log(
        JSON.stringify({
          outcome,
          step: 'reconciled',
          plan: account.planId,
          status: account.status,
          providerStatus: account.providerStatus,
        }),
      )
    } catch (error) {
      console.log(
        JSON.stringify({
          outcome,
          step: 'authorization_attempt',
          error: error instanceof Error ? error.name : 'Error',
          code: string(record(error).code),
          status: record(error).status,
        }),
      )
    }
  }
  console.log(
    'Sandbox fixtures saved privately for browser verification. No existing organizations were changed.',
  )
  await prisma.$disconnect()
}
main().catch(async (error) => {
  console.error(
    JSON.stringify({
      error: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
    }),
  )
  await prisma.$disconnect()
  process.exitCode = 1
})
