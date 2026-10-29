import { fixturePath, output, browserPath } from './billing-test-config'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { prisma } from '../lib/core/prisma'
import { signAuthToken } from '../lib/auth/auth-token'
import { createHmac, randomUUID } from 'node:crypto'
const base = 'http://localhost:4000'
async function main() {
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const results: string[] = []
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    const page = await context.newPage()
    await page.goto(base + '/pricing')
    await page
      .getByRole('heading', { name: 'Simple plans for your admissions team.' })
      .waitFor({ timeout: 20000 })
      .catch(async () => {
        assert.match(await page.locator('body').innerText(), /Starter/)
      })
    assert.match(await page.locator('body').innerText(), /₹1,999/)
    results.push('Public pricing loads with the server catalogue')
    await page.screenshot({
      path: output + '/billing-public-pricing.png',
      fullPage: true,
    })
    const f = fixtures.find((x: { outcome: string }) => x.outcome === 'success')
    await context.addCookies([
      { name: 'auth_token', value: f.authToken, url: base },
      { name: 'current_organization_id', value: f.orgId, url: base },
    ])
    await page.goto(base + '/dashboard/subscription')
    await page
      .getByRole('heading', { name: 'Subscription & usage', exact: true })
      .waitFor({ timeout: 60000 })
    await page
      .getByText(
        'Sandbox billing · Use Cashfree test payment details. No real money is collected.',
      )
      .waitFor({ timeout: 30000 })
    assert.match(await page.locator('body').innerText(), /Starter/)
    const response = await context.request.get(base + '/api/billing')
    assert.equal(response.status(), 200)
    const summary = await response.json()
    assert.equal(summary.account.planId, 'starter')
    assert.equal(summary.period.replyLimit, 1000)
    assert.equal(
      summary.payments.filter(
        (p: { status: string; kind: string }) =>
          p.status === 'SUCCESS' && p.kind !== 'pack',
      ).length,
      1,
    )
    results.push(
      'Real Cashfree sandbox success renders Starter, 1,000 replies and one receipt',
    )
    await page.screenshot({
      path: output + '/billing-dashboard-desktop.png',
      fullPage: true,
    })
    const receipt = summary.payments.find(
      (p: { receiptNumber: string | null }) => p.receiptNumber,
    )
    await page.goto(
      base + '/dashboard/billing/invoices/' + encodeURIComponent(receipt.id),
    )
    assert.match(await page.locator('body').innerText(), /test/i)
    results.push('Administrator can open the sandbox receipt')
    await page.goto(base + '/dashboard/subscription')
    await page
      .getByRole('heading', { name: 'Subscription & usage', exact: true })
      .waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: output + '/billing-dashboard-mobile.png',
      fullPage: true,
    })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    )
    results.push('Billing fits a 390px mobile viewport without page overflow')
    const badOrigin = await context.request.post(base + '/api/billing', {
      headers: { Origin: 'https://untrusted.example' },
      data: { action: 'cancel' },
    })
    assert.equal(badOrigin.status(), 403)
    const invalidPlan = await context.request.post(base + '/api/billing', {
      headers: { Origin: base },
      data: { action: 'checkout', planId: 'free-forever', amount: 1 },
    })
    assert.equal(invalidPlan.status(), 400)
    const forged = await context.request.post(base + '/api/billing/webhook', {
      headers: {
        'x-webhook-timestamp': String(Date.now()),
        'x-webhook-signature': 'forged',
      },
      data: { type: 'SUBSCRIPTION_PAYMENT_SUCCESS', data: {} },
    })
    assert.equal(forged.status(), 401)
    results.push(
      'Forged webhooks, untrusted origins and invalid plans are rejected',
    )
    const failure = fixtures.find(
      (x: { outcome: string }) => x.outcome === 'failure',
    )
    await context.addCookies([
      { name: 'auth_token', value: failure.authToken, url: base },
      { name: 'current_organization_id', value: failure.orgId, url: base },
    ])
    const failSummary = await (
      await context.request.get(base + '/api/billing')
    ).json()
    assert.equal(failSummary.account.planId, 'trial')
    assert.ok(
      failSummary.payments.some(
        (p: { status: string }) => p.status === 'FAILED',
      ),
    )
    results.push(
      'Real Cashfree sandbox failure keeps trial access and records failed payment',
    )
    const editor = await prisma.users.create({
      data: {
        email: `billing-browser-${randomUUID()}@example.invalid`,
        onboardingCompleted: true,
      },
    })
    try {
      await prisma.organizationMembers.create({
        data: { organizationId: f.orgId, userId: editor.id, role: 'editor' },
      })
      await context.addCookies([
        {
          name: 'auth_token',
          value: signAuthToken({ userId: editor.id }, '1h'),
          url: base,
        },
        { name: 'current_organization_id', value: f.orgId, url: base },
      ])
      const editorSummary = await (
        await context.request.get(base + '/api/billing')
      ).json()
      assert.equal(editorSummary.canManage, false)
      assert.equal(editorSummary.payments.length, 0)
      const denied = await context.request.post(base + '/api/billing', {
        headers: { Origin: base },
        data: { action: 'cancel' },
      })
      assert.equal(denied.status(), 403)
      const deniedReceipt = await context.request.get(
        base + '/dashboard/billing/invoices/' + encodeURIComponent(receipt.id),
      )
      const deniedBody = await deniedReceipt.text()
      assert.ok(
        deniedReceipt.status() === 404 ||
          deniedReceipt.status() === 403 ||
          deniedBody.includes('This page could not be found'),
      )
      assert.ok(!deniedBody.includes(receipt.receiptNumber))
      results.push(
        'Editors see usage but cannot manage billing or read receipts',
      )
    } finally {
      await prisma.organizationMembers.deleteMany({
        where: { userId: editor.id },
      })
      await prisma.users.delete({ where: { id: editor.id } })
    }
    await context.addCookies([
      { name: 'auth_token', value: failure.authToken, url: base },
      { name: 'current_organization_id', value: failure.orgId, url: base },
    ])
    const cross = await context.request.post(base + '/api/billing', {
      headers: { Origin: base },
      data: { action: 'refresh', checkoutId: f.checkout.checkoutId },
    })
    assert.equal(cross.status(), 404)
    results.push('Another organization cannot access a checkout')
    const payload = {
      type: 'SUBSCRIPTION_PAYMENT_SUCCESS',
      event_time: new Date().toISOString(),
      data: {
        subscription_id: 'unknown-' + randomUUID(),
        cf_payment_id: 'unknown',
        payment_type: 'AUTH',
        payment_amount: 1999,
        payment_currency: 'INR',
        payment_status: 'SUCCESS',
        authorization_details: { authorization_amount_refund: false },
      },
    }
    const raw = JSON.stringify(payload)
    const stamp = String(Date.now())
    const signature = createHmac(
      'sha256',
      process.env.CASHFREE_WEBHOOK_SECRET ||
        process.env.CASHFREE_CLIENT_SECRET!,
    )
      .update(stamp + raw)
      .digest('base64')
    const signed = await context.request.post(base + '/api/billing/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': stamp,
        'x-webhook-signature': signature,
      },
      data: raw,
    })
    assert.equal(signed.status(), 200)
    results.push(
      'Raw signed HTTP webhook is accepted without granting unknown subscriptions',
    )
    const { eventId } = await import('../lib/billing/events')
    await prisma.billingEvent.deleteMany({ where: { id: eventId(payload) } })
    await writeFile(
      output + '/billing-browser-results.json',
      JSON.stringify({ passed: results }, null, 2),
    )
    console.log(JSON.stringify({ passed: results }))
  } finally {
    await browser.close()
    await prisma.$disconnect()
  }
}
main().catch(async (e) => {
  console.error({ name: e.name, message: e.message })
  await prisma.$disconnect()
  process.exitCode = 1
})
