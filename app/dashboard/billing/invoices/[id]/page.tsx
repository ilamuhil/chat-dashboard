import { notFound } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organization-members'
import { prisma } from '@/lib/prisma'
import { record, string } from '@/lib/billing/events'
import { money } from '@/lib/billing/catalog'
import { BillingTaxBreakdown } from '@/components/billing-tax-breakdown'
import { invoiceAvailableAt, type GstBreakdown } from '@/lib/billing/tax'
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const actor = await requireOrganizationMembership()
  if (actor.role !== 'admin') notFound()
  const { id } = await params
  const payment = await prisma.billingPayment.findFirst({
    where: {
      id,
      organizationId: actor.organizationId,
      receiptNumber: { not: null },
    },
  })
  if (!payment) notFound()
  const snapshot = record(payment.snapshot)
  const buyer = record(snapshot.billingDetails)
  const seller = record(snapshot.seller)
  return (
    <article className="dashboard-surface mx-auto w-full max-w-2xl overflow-auto rounded-xl p-8 print:border-0 print:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
        {snapshot.sandbox
          ? 'Sandbox test receipt · Not a tax invoice'
          : 'Payment receipt'}
      </p>
      <h1 className="mt-4 text-2xl font-semibold">{payment.receiptNumber}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {payment.paidAt?.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
        })}{' '}
        · {payment.status.toLowerCase()}
      </p>
      <div className="my-8 grid gap-6 border-y border-border py-6 text-sm sm:grid-cols-2">
        <div>
          <h2 className="font-semibold">From</h2>
          <p className="mt-2">{string(seller.name) || 'AI Chat Bot'}</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {string(seller.address)}
          </p>
          {Boolean(seller.gstin) && <p>GSTIN: {string(seller.gstin)}</p>}
        </div>
        <div>
          <h2 className="font-semibold">Billed to</h2>
          <p className="mt-2">{string(buyer.name) || 'Organization'}</p>
          <p className="text-muted-foreground">{string(buyer.email)}</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {string(buyer.address)}
          </p>
          {Boolean(buyer.gstin) && <p>GSTIN: {string(buyer.gstin)}</p>}
        </div>
      </div>
      <h2 className="font-medium">
        {string(snapshot.planName) || 'AI reply pack'}
      </h2>
      <div className="mt-5 space-y-3 text-sm">
        <BillingTaxBreakdown
          quote={{
            subtotalPaise: Number(
              snapshot.subtotalPaise ?? payment.amountPaise,
            ),
            taxPaise: Number(snapshot.taxPaise || 0),
            totalPaise: payment.amountPaise,
            taxBreakdown: snapshot.taxBreakdown as GstBreakdown | undefined,
          }}
        />
        {payment.refundedPaise > 0 && (
          <div className="flex justify-between">
            <dt>Refunded</dt>
            <dd>{money(payment.refundedPaise)}</dd>
          </div>
        )}
      </div>
      {payment.paidAt &&
        (invoiceAvailableAt(payment.paidAt) <= new Date() ? (
          <a
            className="mt-6 inline-block text-sm text-sky-700 underline"
            href={`/api/billing/invoices/${encodeURIComponent(payment.id)}`}
            download
          >
            Download PDF invoice
          </a>
        ) : (
          <p className="mt-6 text-xs text-muted-foreground">
            PDF invoice available{' '}
            {invoiceAvailableAt(payment.paidAt).toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}
            , seven days after payment.
          </p>
        ))}
      <p className="mt-8 break-all text-xs text-muted-foreground">
        Payment reference: {payment.id}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {snapshot.sandbox
          ? 'This test document does not represent a real payment or GST charge.'
          : 'This receipt confirms payment. Contact billing support if you require additional invoice information.'}
      </p>
    </article>
  )
}
