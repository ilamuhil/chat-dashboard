import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { BillingPayment, BillingPeriod } from '@/generated/prisma/client'
import { record, string } from './events'
import { gstBreakdown, stateName, type GstBreakdown } from './tax'
import { SAMPLE_VENDOR } from './vendor'

const formatDate = (value: Date) =>
  value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
const amount = (value: number) =>
  `INR ${(value / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export async function generateInvoice(
  payment: BillingPayment,
  period: BillingPeriod | null,
) {
  if (!payment.paidAt || !payment.receiptNumber)
    throw new Error('Only collected payments can have an invoice.')
  const snapshot = record(payment.snapshot)
  const storedPeriod = record(snapshot.period)
  const startsAt = new Date(string(storedPeriod.startsAt))
  const endsAt = new Date(string(storedPeriod.endsAt))
  const invoicePeriod =
    period ||
    (Number.isFinite(startsAt.getTime()) && Number.isFinite(endsAt.getTime())
      ? { startsAt, endsAt }
      : null)
  const sandbox = snapshot.sandbox === true
  const storedVendor = Object.fromEntries(
    Object.entries(record(snapshot.seller)).filter(([, value]) =>
      Boolean(value),
    ),
  )
  const seller = { ...(sandbox ? SAMPLE_VENDOR : {}), ...storedVendor }
  const buyer = record(snapshot.billingDetails)
  const subtotal = Number(snapshot.subtotalPaise ?? payment.amountPaise)
  const tax = Number(snapshot.taxPaise || 0)
  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(tax) ||
    subtotal + tax !== payment.amountPaise
  )
    throw new Error('The saved invoice amounts do not reconcile.')
  const breakdown = Object.keys(record(snapshot.taxBreakdown)).length
    ? (snapshot.taxBreakdown as GstBreakdown)
    : gstBreakdown(
        tax,
        Number(snapshot.taxBps || 0),
        string(seller.stateCode || string(seller.gstin).slice(0, 2)),
        string(buyer.stateCode || string(buyer.gstin).slice(0, 2)),
      )
  if (
    breakdown.cgstPaise +
      breakdown.sgstPaise +
      breakdown.utgstPaise +
      breakdown.igstPaise !==
    tax
  )
    throw new Error('Saved tax components do not reconcile.')
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(
    await readFile(path.join(process.cwd(), 'lib/billing/fonts/NotoSans.ttf')),
    { subset: true },
  )
  doc.setTitle(`Invoice ${payment.invoiceNumber}`)
  doc.setAuthor(string(seller.name))
  doc.setCreationDate(payment.paidAt)
  doc.setModificationDate(payment.paidAt)
  const ink = rgb(0.12, 0.18, 0.28),
    muted = rgb(0.4, 0.46, 0.54),
    accent = rgb(0.02, 0.4, 0.57)
  let page: PDFPage = doc.addPage([595.28, 841.89]),
    y = 780
  const pages: PDFPage[] = [page]
  function newPage() {
    page = doc.addPage([595.28, 841.89])
    pages.push(page)
    y = 780
  }
  function text(value: string, x: number, top: number, size = 10, color = ink) {
    page.drawText(value, { x, y: top, font, size, color })
  }
  function wrap(value: string, width: number, size = 10) {
    const lines: string[] = []
    for (const paragraph of value.replaceAll('\r', '').split('\n')) {
      let line = ''
      for (const token of paragraph.split(/\s+/)) {
        if (line && font.widthOfTextAtSize(`${line} ${token}`, size) > width) {
          lines.push(line)
          line = ''
        }
        // Long unbroken references also wrap without extending past the page.
        for (const char of (line ? ' ' : '') + token) {
          if (font.widthOfTextAtSize(line + char, size) > width) {
            lines.push(line)
            line = ''
          }
          line += char
        }
      }
      lines.push(line)
    }
    return lines
  }
  function paragraph(
    value: string,
    x = 48,
    width = 499,
    size = 10,
    color = ink,
  ) {
    for (const line of wrap(value, width, size)) {
      if (y < 110) newPage()
      text(line, x, y, size, color)
      y -= size + 5
    }
  }
  function right(value: string, top: number, size = 10) {
    text(value, 547 - font.widthOfTextAtSize(value, size), top, size)
  }
  text(sandbox ? 'SANDBOX SAMPLE INVOICE' : 'INVOICE', 48, y, 11, accent)
  y -= 34
  text(payment.invoiceNumber, 48, y, 24)
  right('PAID', y, 12)
  y -= 23
  text(`Invoice date: ${formatDate(payment.paidAt)}`, 48, y, 9, muted)
  right(`Currency: ${payment.currency}`, y, 9)
  y -= 30
  if (sandbox) {
    paragraph(
      'Sample vendor details. Test document only - not valid for GST input credit or real payment.',
      48,
      499,
      9,
      accent,
    )
    y -= 10
  }
  for (const [label, details] of [
    ['VENDOR', seller],
    ['BILLED TO', buyer],
  ] as const) {
    paragraph(label, 48, 499, 9, muted)
    paragraph(string(details.name) || 'Organization', 48, 499, 12)
    if (details.address) paragraph(string(details.address), 48, 499, 10, muted)
    paragraph(
      `GSTIN: ${string(details.gstin) || 'Not provided / unregistered'}`,
      48,
      499,
      10,
    )
    const state = string(details.stateCode || string(details.gstin).slice(0, 2))
    if (state)
      paragraph(`State: ${stateName(state)} (${state})`, 48, 499, 9, muted)
    y -= 12
  }
  if (y < 360) newPage()
  page.drawLine({
    start: { x: 48, y },
    end: { x: 547, y },
    thickness: 0.7,
    color: rgb(0.84, 0.88, 0.91),
  })
  y -= 26
  paragraph('SERVICE DETAILS', 48, 499, 9, muted)
  paragraph(string(snapshot.planName) || 'AI reply credit pack', 48, 499, 12)
  if (invoicePeriod)
    paragraph(
      `Billing period: ${formatDate(invoicePeriod.startsAt)} to ${formatDate(invoicePeriod.endsAt)}`,
      48,
      499,
      10,
      muted,
    )
  else if (payment.kind === 'pack')
    paragraph(
      'One-time purchase: 1,000 AI replies, valid for 90 days after collection.',
      48,
      499,
      10,
      muted,
    )
  else paragraph('Monthly subscription', 48, 499, 10, muted)
  paragraph(
    `SAC: ${string(seller.sac) || 'Not configured'}${sandbox ? ' (sample classification)' : ''}`,
    48,
    499,
    9,
    muted,
  )
  if (breakdown.placeOfSupply)
    paragraph(
      `Place of supply: ${stateName(breakdown.placeOfSupply)} (${breakdown.placeOfSupply})`,
      48,
      499,
      9,
      muted,
    )
  y -= 12
  const rows: [string, string][] = [
    ['Base value (taxable amount)', amount(subtotal)],
  ]
  if (breakdown.kind === 'cgst_sgst' || breakdown.kind === 'cgst_utgst') {
    rows.push([
      `CGST (${breakdown.rateBps / 200}%)`,
      amount(breakdown.cgstPaise),
    ])
    rows.push([
      `${breakdown.kind === 'cgst_utgst' ? 'UTGST' : 'SGST'} (${breakdown.rateBps / 200}%)`,
      amount(breakdown.sgstPaise + breakdown.utgstPaise),
    ])
    rows.push(['IGST', 'Not applicable'])
  } else if (breakdown.kind === 'igst')
    rows.push(
      ['CGST / SGST / UTGST', 'Not applicable'],
      [`IGST (${breakdown.rateBps / 100}%)`, amount(breakdown.igstPaise)],
    )
  else rows.push(['CGST / SGST / UTGST / IGST', 'Not charged'])
  rows.push(
    ['Total tax', amount(tax)],
    ['Total collected', amount(payment.amountPaise)],
  )
  for (const [label, value] of rows) {
    if (y < 130) newPage()
    if (label === 'Total collected') {
      page.drawRectangle({
        x: 40,
        y: y - 11,
        width: 515,
        height: 29,
        color: rgb(0.93, 0.97, 0.99),
      })
    }
    text(label, 48, y, 10)
    right(value, y, 10)
    y -= 28
  }
  if (payment.refundedPaise) {
    text('Refunded after collection', 48, y, 10)
    right(amount(payment.refundedPaise), y)
    y -= 28
  }
  y -= 10
  paragraph(`Payment reference: ${payment.id}`, 48, 499, 8, muted)
  if (seller.support)
    paragraph(`Billing support: ${string(seller.support)}`, 48, 499, 8, muted)
  pages.forEach((item, index) => {
    item.drawText(
      sandbox
        ? 'SAMPLE - SANDBOX ONLY'
        : 'Generated electronically from the recorded payment.',
      { x: 48, y: 48, font, size: 8, color: muted },
    )
    item.drawText(`${index + 1} / ${pages.length}`, {
      x: 520,
      y: 48,
      font,
      size: 8,
      color: muted,
    })
  })
  return doc.save()
}
