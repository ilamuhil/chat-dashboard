import { NextRequest, NextResponse } from 'next/server'
import { billingActor } from '@/lib/billing/guards'
import { prisma } from '@/lib/prisma'
import { BillingError } from '@/lib/billing/service'
import { invoiceAvailableAt } from '@/lib/billing/tax'
import { generateInvoice } from '@/lib/billing/invoice'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await billingActor(request)
    const { id } = await params
    const payment = await prisma.billingPayment.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        receiptNumber: { not: null },
        paidAt: { not: null },
        status: { in: ['SUCCESS', 'REFUNDED'] },
      },
    })
    if (!payment?.paidAt) throw new BillingError('Invoice not found.', 404)
    const availableAt = invoiceAvailableAt(payment.paidAt)
    if (availableAt > new Date())
      return NextResponse.json(
        {
          error: 'The PDF invoice becomes available seven days after payment.',
          availableAt: availableAt.toISOString(),
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    const period = await prisma.billingPeriod.findUnique({
      where: { paymentId: payment.id },
    })
    const pdf = await generateInvoice(payment, period)
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${payment.invoiceNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BillingError
            ? error.message
            : 'The invoice could not be generated. Please try again.',
      },
      {
        status: error instanceof BillingError ? error.status : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
