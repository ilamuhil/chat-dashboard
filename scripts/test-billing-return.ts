import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { fixturePath, output, browserPath } from './billing-test-config'
import { signAuthToken } from '../lib/auth-token'

async function main() {
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  const owner = fixtures.find(
    (item: { outcome: string }) => item.outcome === 'success',
  )
  const base = process.env.BILLING_TEST_BASE_URL || 'http://localhost:4000'
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const passed: string[] = []
  try {
    const context = await browser.newContext()
    await context.addCookies([
      {
        name: 'auth_token',
        value: signAuthToken({ userId: owner.userId }, '10m'),
        url: base,
      },
      { name: 'current_organization_id', value: owner.orgId, url: base },
    ])
    let calls = 0
    let outcome = 'active'
    await context.route('**/api/billing', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      calls++
      const body = route.request().postDataJSON()
      assert.equal(body.action, 'refresh')
      await route.fulfill({
        json: { ok: true, checkoutStatus: calls < 3 ? 'ready' : outcome },
      })
    })
    const page = await context.newPage()
    await page.goto(base + '/dashboard/subscription?checkout=' + randomUUID())
    await page
      .getByText(
        'Waiting for payment confirmation. This page will update automatically.',
      )
      .waitFor({ timeout: 30000 })
    await page
      .getByText('Payment verified. Your updated allowance is ready.')
      .waitFor({ timeout: 30000 })
    assert.equal(calls, 3)
    passed.push(
      'Checkout return polls pending confirmation and updates after verified payment',
    )
    calls = 0
    outcome = 'failed'
    await page.goto(base + '/dashboard/subscription?checkout=' + randomUUID())
    await page
      .getByText(
        'Payment was not completed. You can review it below and try again.',
      )
      .waitFor({ timeout: 30000 })
    assert.equal(calls, 3)
    passed.push(
      'Failed checkout return stops polling and offers a clear retry message',
    )
    await writeFile(
      output + '/billing-return-results.json',
      JSON.stringify({ passed }, null, 2),
    )
    console.log(JSON.stringify({ passed }))
  } finally {
    await browser.close()
  }
}
void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
