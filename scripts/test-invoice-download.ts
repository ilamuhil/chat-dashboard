import { output, work, fixturePath, browserPath } from './billing-test-config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'
import { prisma } from '../lib/core/prisma'
import { SAMPLE_VENDOR } from '../lib/billing/vendor'
import { gstBreakdown } from '../lib/billing/tax'
import { quote } from '../lib/billing/catalog'
const base = 'http://localhost:4000'
async function main() {
  const fixtures = JSON.parse(
    await readFile(fixturePath, 'utf8'),
  )
  const owner = fixtures.find(
    (x: { outcome: string }) => x.outcome === 'success',
  )
  const other = fixtures.find(
    (x: { outcome: string }) => x.outcome === 'failure',
  )
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })
  const created: string[] = []
  const payments: string[] = []
  const results: string[] = []
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    })
    await context.addCookies([
      { name: 'auth_token', value: owner.authToken, url: base },
      { name: 'current_organization_id', value: owner.orgId, url: base },
    ])
    const values = quote(199900, 1800)
    for (const [kind, sellerState, buyerState] of [
      ['igst', '29', '33'],
      ['cgst_sgst', '29', '29'],
      ['cgst_utgst', '04', '04'],
    ] as const) {
      const breakdown = gstBreakdown(
        values.taxPaise,
        values.taxBps,
        sellerState,
        buyerState,
      )
      assert.equal(breakdown.kind, kind)
      assert.equal(
        breakdown.cgstPaise +
          breakdown.sgstPaise +
          breakdown.utgstPaise +
          breakdown.igstPaise,
        values.taxPaise,
      )
      const id = 'invoice-test-' + randomUUID()
      const checkout = await prisma.billingCheckout.create({
        data: {
          organizationId: owner.orgId,
          kind: 'subscription',
          status: 'active',
          planId: 'starter',
          providerId: id,
          firstChargeAt: new Date(),
          expiresAt: new Date(),
          ...values,
        },
      })
      created.push(checkout.id)
      const payment = await prisma.billingPayment.create({
        data: {
          id,
          organizationId: owner.orgId,
          checkoutId: checkout.id,
          kind: 'AUTH',
          status: 'SUCCESS',
          amountPaise: values.totalPaise,
          paidAt: new Date(),
          receiptNumber: 'RCPT-' + id,
          snapshot: {
            ...values,
            taxBreakdown: breakdown,
            planName: 'Starter monthly subscription - invoice download test',
            sandbox: true,
            billingDetails: {
              name: 'Sample Institute of Learning',
              email: 'accounts@example.invalid',
              address:
                buyerState === '33'
                  ? '45 Sample Education Road, Chennai, Tamil Nadu 600001, India'
                  : '45 Sample Education Road, Bengaluru, Karnataka 560001, India',
              gstin: buyerState + 'ABCDE1234F1Z5',
              stateCode: buyerState,
            },
            seller: {
              ...SAMPLE_VENDOR,
              stateCode: sellerState,
              gstin: sellerState + 'ABCDE1234F1Z5',
            },
          },
        },
      })
      payments.push(id)
      const early = await context.request.get(
        base + '/api/billing/invoices/' + encodeURIComponent(id),
      )
      assert.equal(early.status(), 409)
      const earlyBody = await early.json()
      assert.ok(
        new Date(earlyBody.availableAt).getTime() >=
          payment.paidAt!.getTime() + 7 * 86400000,
      )
      const start = new Date(Date.now() - 8 * 86400000)
      await prisma.billingPayment.update({
        where: { id },
        data: { paidAt: start },
      })
      await prisma.billingPeriod.create({
        data: {
          organizationId: owner.orgId,
          planId: 'starter',
          planVersion: '2026-10-16',
          startsAt: start,
          endsAt: new Date(start.getTime() + 30 * 86400000),
          replyLimit: 1000,
          trainingLimit: 1000000,
          paymentId: id,
        },
      })
      const pdf = await context.request.get(
        base + '/api/billing/invoices/' + encodeURIComponent(id),
      )
      assert.equal(pdf.status(), 200, await pdf.text().catch(() => ''))
      assert.match(pdf.headers()['content-type'], /application\/pdf/)
      assert.match(pdf.headers()['content-disposition'], /attachment/)
      const body = await pdf.body()
      assert.equal(body.subarray(0, 5).toString(), '%PDF-')
      const parsed = await PDFDocument.load(body)
      assert.ok(parsed.getPageCount() >= 1)
      await writeFile(work + '/invoice-' + kind + '.pdf', body)
      results.push(
        kind +
          ': seven-day lock, correct component sum and valid authenticated PDF download',
      )
      if (kind === 'igst') {
        const page = await context.newPage()
        await page.goto(base + '/dashboard/billing')
        await page
          .getByRole('heading', { name: 'Billing & invoices', exact: true })
          .waitFor({ timeout: 60000 })
        const downloadPromise = page.waitForEvent('download')
        await page
          .getByRole('button', { name: 'Download PDF', exact: true })
          .first()
          .click()
        const download = await downloadPromise
        await download.saveAs(output + '/invoice-sample.pdf')
        assert.match(download.suggestedFilename(), /^INV\d+\.pdf$/)
        results.push(
          'Actual billing-page Download PDF button generates and downloads the invoice',
        )
      }
    }
    await context.addCookies([
      { name: 'auth_token', value: other.authToken, url: base },
      { name: 'current_organization_id', value: other.orgId, url: base },
    ])
    const denied = await context.request.get(
      base + '/api/billing/invoices/' + encodeURIComponent(payments[0]),
    )
    assert.equal(denied.status(), 404)
    results.push('Cross-organization invoice download is denied')
    await context.clearCookies()
    assert.equal(
      (
        await context.request.get(
          base + '/api/billing/invoices/' + encodeURIComponent(payments[0]),
        )
      ).status(),
      401,
    )
    results.push('Unauthenticated invoice download is denied')
    await writeFile(
      output + '/invoice-test-results.json',
      JSON.stringify({ passed: results }, null, 2),
    )
    console.log(JSON.stringify({ passed: results }))
  } finally {
    await browser.close()
    await prisma.billingPeriod.deleteMany({
      where: { paymentId: { in: payments } },
    })
    await prisma.billingPayment.deleteMany({ where: { id: { in: payments } } })
    await prisma.billingCheckout.deleteMany({ where: { id: { in: created } } })
    await prisma.$disconnect()
  }
}
main().catch(async (e) => {
  console.error({
    name: e.name,
    message: e.message,
    stack: e.stack?.split('\n').slice(0, 3).join('\n'),
  })
  await prisma.$disconnect()
  process.exitCode = 1
})
