import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { prisma } from '../lib/prisma'
import { signAuthToken } from '../lib/auth-token'
import { browserPath, output } from './billing-test-config'

async function main() {
  const orgId = 'billing-details-test-' + randomUUID()
  const base = process.env.BILLING_TEST_BASE_URL || 'http://localhost:4000'
  const user = await prisma.users.create({
    data: {
      email: orgId + '@example.invalid',
      onboardingCompleted: true,
      emailVerified: true,
    },
  })
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const passed: string[] = []
  try {
    await prisma.organizations.create({
      data: {
        id: orgId,
        name: 'Billing details test',
        organizationMembers: { create: { userId: user.id, role: 'admin' } },
      },
    })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    await context.addCookies([
      {
        name: 'auth_token',
        value: signAuthToken({ userId: user.id }, '10m'),
        url: base,
      },
      { name: 'current_organization_id', value: orgId, url: base },
    ])
    const response = await context.request.post(base + '/api/billing', {
      headers: { Origin: base },
      data: { action: 'checkout', planId: 'starter' },
    })
    assert.equal(response.status(), 400)
    assert.match(await response.text(), /Complete your billing/)
    assert.equal(
      await prisma.billingCheckout.count({ where: { organizationId: orgId } }),
      0,
    )
    const incomplete = await context.request.patch(base + '/api/billing', {
      headers: { Origin: base },
      data: {
        name: 'Test Institute',
        email: 'billing@example.invalid',
        phone: '9999999999',
        stateCode: '33',
        address: '',
        gstin: '',
      },
    })
    assert.equal(incomplete.status(), 400)
    passed.push(
      'Server rejects checkout and incomplete billing details before creating any payment session',
    )
    const page = await context.newPage()
    await page.goto(base + '/dashboard/subscription')
    await page
      .getByRole('heading', { name: 'Subscription & usage', exact: true })
      .waitFor({ timeout: 60000 })
    assert.equal(
      await page
        .getByRole('heading', { name: 'Billing details', exact: true })
        .count(),
      0,
    )
    assert.equal(
      await page
        .getByRole('heading', { name: 'Payments & invoices', exact: true })
        .count(),
      0,
    )
    await page
      .getByRole('button', { name: 'Choose plan', exact: true })
      .first()
      .click({ timeout: 60000 })
    await page.waitForURL('**/dashboard/billing?plan=starter&kind=subscription')
    await page
      .getByRole('heading', { name: 'Billing & invoices', exact: true })
      .waitFor()
    const address = page.getByLabel('Billing address', { exact: true })
    await address.waitFor({ timeout: 30000 })
    assert.equal(await address.getAttribute('required'), '')
    await page
      .getByLabel('Billing name / business name', { exact: true })
      .fill('Sample Institute')
    await page
      .getByLabel('Billing email', { exact: true })
      .fill('billing@example.invalid')
    await page
      .getByLabel('Indian phone number', { exact: true })
      .fill('9999999999')
    await address.fill('45 Sample Road, Chennai, Tamil Nadu 600001, India')
    await page.getByRole('combobox').selectOption('33')
    await page
      .getByRole('button', { name: 'Save and review payment', exact: true })
      .click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('heading', { name: 'Review your payment' })
      .waitFor({ timeout: 60000 })
    assert.match(await dialog.innerText(), /2,358.82/)
    assert.equal(
      await prisma.billingCheckout.count({ where: { organizationId: orgId } }),
      0,
    )
    passed.push(
      'Choosing a plan routes to required billing details, saves them and returns to payment review',
    )
    await dialog
      .getByRole('button', { name: 'Keep reviewing', exact: true })
      .click()
    await page.getByRole('link', { name: 'Manage billing & invoices' }).click()
    await page
      .getByRole('heading', { name: 'Payments & invoices', exact: true })
      .waitFor({ timeout: 30000 })
    await page.screenshot({
      path: output + '/billing-and-invoices.png',
      fullPage: true,
    })
    passed.push(
      'Subscription links to a separate billing and invoice page; GSTIN remains optional',
    )
    await writeFile(
      output + '/billing-details-results.json',
      JSON.stringify({ passed }, null, 2),
    )
    console.log(JSON.stringify({ passed }))
  } finally {
    await browser.close()
    await prisma.organizations.deleteMany({ where: { id: orgId } })
    await prisma.billingTrialClaim.deleteMany({ where: { userId: user.id } })
    await prisma.users.deleteMany({ where: { id: user.id } })
    await prisma.$disconnect()
  }
}
void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
