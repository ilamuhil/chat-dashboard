import { fixturePath, output, browserPath } from './billing-test-config'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { prisma } from '../lib/prisma'
const base = 'http://localhost:4000'
async function main() {
  const fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  const f = fixtures.find((x: { outcome: string }) => x.outcome === 'failure')
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const before = await prisma.billingCheckout.findMany({
    where: { organizationId: f.orgId },
    select: { id: true },
  })
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    })
    await context.addCookies([
      { name: 'auth_token', value: f.authToken, url: base },
      { name: 'current_organization_id', value: f.orgId, url: base },
    ])
    const details = await context.request.patch(base + '/api/billing', {
      headers: { Origin: base },
      data: {
        name: 'Sandbox Institute',
        email: 'accounts@example.invalid',
        phone: '9999999999',
        address: '45 Sample Road, Chennai, Tamil Nadu 600001',
        gstin: '',
        stateCode: '33',
      },
    })
    assert.equal(details.status(), 200)
    const page = await context.newPage()
    await page.goto(base + '/dashboard/subscription')
    await page
      .getByRole('button', { name: 'Choose plan', exact: true })
      .first()
      .click({ timeout: 60000 })
    const dialog = page.getByRole('dialog')
    await dialog.getByText('IGST (18%)', { exact: true }).waitFor()
    assert.match(await dialog.innerText(), /2,358.82/)
    await dialog.getByRole('checkbox').check()
    await dialog
      .getByRole('button', { name: 'Continue to Cashfree', exact: true })
      .click()
    await page.waitForURL((url) => url.hostname.endsWith('cashfree.com'), {
      timeout: 60000,
    })
    await page.locator('body').waitFor()
    await page.screenshot({
      path: output + '/cashfree-sandbox-checkout.png',
      fullPage: true,
    })
    const result = {
      passed: [
        'Server quote shows INR 1,999 base, IGST 18% and INR 2,358.82 before consent',
        'Consent sends the user through the real Cashfree Subscriptions hosted checkout',
      ],
      host: new URL(page.url()).hostname,
    }
    await writeFile(
      output + '/hosted-checkout-results.json',
      JSON.stringify(result, null, 2),
    )
    console.log(JSON.stringify(result))
  } finally {
    const after = await prisma.billingCheckout.findMany({
      where: {
        organizationId: f.orgId,
        id: { notIn: before.map((c) => c.id) },
      },
    })
    const token = f.authToken
    for (const c of after)
      await fetch(base + '/api/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: base,
          Cookie: `auth_token=${token}; current_organization_id=${f.orgId}`,
        },
        body: JSON.stringify({ action: 'abandon', checkoutId: c.id }),
      })
    await browser.close()
    await prisma.$disconnect()
  }
}
main().catch(async (e) => {
  console.error({ name: e.name, message: e.message })
  await prisma.$disconnect()
  process.exitCode = 1
})
