import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cancelCashfreeSubscription, CashfreeError } from '../../lib/billing/cashfree'

test('cancellation recovers only when Cashfree confirms an already cancelled mandate', async (t) => {
  const originalFetch = globalThis.fetch
  const originalEnv = { ...process.env }
  process.env.CASHFREE_CLIENT_ID = 'test'
  process.env.CASHFREE_CLIENT_SECRET = 'test'
  process.env.CASHFREE_ENVIRONMENT = 'sandbox'
  t.after(() => {
    globalThis.fetch = originalFetch
    process.env = originalEnv
  })

  for (const status of ['CANCELLED', 'CUSTOMER_CANCELLED', 'ACTIVE', 'LINK_EXPIRED', 'UNAVAILABLE']) {
    await t.test(status, async () => {
      const calls: string[] = []
      globalThis.fetch = async (input, init) => {
        calls.push(`${init?.method} ${input}`)
        if (init?.method === 'POST') {
          assert.deepEqual(JSON.parse(String(init.body)), {
            subscription_id: 'sub_test', action: 'CANCEL',
          })
          return Response.json({ code: 'subscription_status_invalid' }, { status: 400 })
        }
        return status === 'UNAVAILABLE'
          ? Response.json({ code: 'provider_error' }, { status: 503 })
          : Response.json({ subscription_status: status })
      }
      if (status === 'CANCELLED' || status === 'CUSTOMER_CANCELLED') {
        assert.equal(await cancelCashfreeSubscription('sub_test'), status)
      } else {
        await assert.rejects(cancelCashfreeSubscription('sub_test'), (error: unknown) =>
          error instanceof CashfreeError && error.code === 'subscription_status_invalid',
        )
      }
      assert.deepEqual(calls, [
        'POST https://sandbox.cashfree.com/pg/subscriptions/sub_test/manage',
        'GET https://sandbox.cashfree.com/pg/subscriptions/sub_test',
      ])
    })
  }
  await t.test('successful cancellation needs no recovery request', async () => {
    let calls = 0
    globalThis.fetch = async () => {
      calls++
      return Response.json({ subscription_status: 'CANCELLED' })
    }
    assert.equal(await cancelCashfreeSubscription('sub_test'), 'CANCELLED')
    assert.equal(calls, 1)
  })
})
