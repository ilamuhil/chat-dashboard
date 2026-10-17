'use client'

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { INDIAN_STATES, invoiceAvailableAt } from '@/lib/billing/tax'
import { money } from '@/lib/billing/catalog'
import { billingRequest, date, fetchInvoice } from './billing-utils'
import type { Payment, Summary } from './billing-types'

const inputClass =
  'mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15'

export function BillingDetails({
  summary,
  onSaved,
  onError,
  continueCheckout = false,
}: {
  summary: Summary
  continueCheckout?: boolean
  onSaved: () => Promise<void>
  onError: (message: string) => void
}) {
  const [saved, setSaved] = useState(false)
  const saveDetails = useMutation({
    mutationFn: (details: Record<string, FormDataEntryValue>) =>
      billingRequest<{ ok: true }>('PATCH', details),
    onMutate: () => setSaved(false),
    onSuccess: async () => {
      await onSaved()
      setSaved(true)
    },
    onError: (error) =>
      onError(
        error instanceof Error
          ? error.message
          : 'Could not save billing details.',
      ),
  })
  const saving = saveDetails.isPending
  const details = summary.account.billingDetails
  return (
    <section className="dashboard-surface rounded-xl p-5">
      <h2 className="text-sm font-semibold">Billing details</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Required before payment. GSTIN is optional. Changes do not rewrite
        previous receipts.
      </p>
      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          saveDetails.mutate(Object.fromEntries(form))
        }}
      >
        {(
          [
            {
              name: 'name',
              label: 'Billing name / business name',
              value: details.name || summary.organization.name || '',
              required: true,
            },
            {
              name: 'email',
              label: 'Billing email',
              value: details.email || summary.organization.email || '',
              required: true,
              type: 'email',
            },
            {
              name: 'phone',
              label: 'Indian phone number',
              value: details.phone || summary.organization.phone || '',
              required: true,
              type: 'tel',
            },
            {
              name: 'gstin',
              label: 'GSTIN (optional)',
              value: details.gstin || '',
            },
            {
              name: 'address',
              label: 'Billing address',
              value: details.address || '',
              required: true,
            },
          ] as const
        ).map((field) => (
          <label key={field.name} className="text-xs text-muted-foreground">
            {field.label}
            <input
              name={field.name}
              defaultValue={field.value}
              type={'type' in field ? field.type : 'text'}
              required={'required' in field && field.required}
              minLength={
                field.name === 'address'
                  ? 10
                  : field.name === 'name'
                    ? 2
                    : undefined
              }
              pattern={field.name === 'phone' ? '[0-9]{10}' : undefined}
              maxLength={field.name === 'address' ? 1000 : 120}
              className={inputClass}
            />
          </label>
        ))}
        <label className="text-xs text-muted-foreground">
          Billing state (place of supply)
          <select
            name="stateCode"
            required
            defaultValue={details.stateCode || details.gstin?.slice(0, 2) || ''}
            className={inputClass}
          >
            <option value="">Choose a state</option>
            {INDIAN_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-3">
          <Button variant="outline" disabled={saving} type="submit">
            {saving
              ? 'Saving…'
              : continueCheckout
                ? 'Save and review payment'
                : 'Save billing details'}
          </Button>
          {saved && (
            <span role="status" className="pb-2 text-xs text-emerald-700">
              Saved
            </span>
          )}
        </div>
      </form>
    </section>
  )
}


function InvoiceDownload({
  payment,
  onError,
}: {
  payment: Payment
  onError: (value: string) => void
}) {
  const download = useMutation({
    mutationFn: () => fetchInvoice(payment.id),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    onError: (error) =>
      onError(
        error instanceof Error
          ? error.message
          : 'Could not download the invoice.',
      ),
  })
  const downloading = download.isPending
  const available = invoiceAvailableAt(payment.paidAt!)
  if (available > new Date())
    return (
      <span className="mt-1 block whitespace-nowrap text-[10px] text-muted-foreground">
        PDF available {date(available.toISOString())}
      </span>
    )
  return (
    <button
      type="button"
      disabled={downloading}
      className="mt-2 inline-flex items-center gap-1 whitespace-nowrap text-sky-700 disabled:opacity-50 dark:text-sky-300"
      onClick={() => download.mutate()}
    >
      <Download className="size-3.5" />
      {downloading ? 'Generating…' : 'Download PDF'}
    </button>
  )
}

export function PaymentHistory({
  summary,
  onError,
}: {
  summary: Summary
  onError: (message: string) => void
}) {
  return (
    <section className="dashboard-surface rounded-xl p-5">
      <h2 className="text-sm font-semibold">Payments & invoices</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Payment status is verified with the payment provider. Sandbox receipts are test
        documents. PDF invoices unlock seven days after payment and are
        generated when requested.
      </p>
      {summary.payments.some((payment) => payment.snapshot?.demo) && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Sample invoices are preview records. They do not change your plan or
          allowance.
        </p>
      )}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-3 font-medium">Date</th>
              <th className="font-medium">Payment</th>
              <th className="font-medium">Amount</th>
              <th className="font-medium">Status</th>
              <th className="text-right font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {summary.payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border/50">
                <td className="py-3">{date(payment.paidAt)}</td>
                <td className="py-3 pr-4">
                  {payment.snapshot?.planName ||
                    (payment.kind === 'pack'
                      ? 'AI reply pack'
                      : 'Subscription')}
                  {payment.snapshot?.demo && (
                    <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                      Sample
                    </span>
                  )}
                  {payment.invoiceNumber && (
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                      {payment.invoiceNumber}
                    </p>
                  )}
                  {payment.failureReason && (
                    <p className="mt-1 max-w-xs text-muted-foreground">
                      {payment.failureReason}
                    </p>
                  )}
                </td>
                <td className="tabular-nums">{money(payment.amountPaise)}</td>
                <td>{payment.status.toLowerCase().replaceAll('_', ' ')}</td>
                <td className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    {payment.receiptNumber ? (
                      <a
                        className="inline-flex gap-1 text-sky-700 dark:text-sky-300"
                        href={`/dashboard/billing/invoices/${encodeURIComponent(payment.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download className="size-3.5" />
                        Receipt
                      </a>
                    ) : (
                      '—'
                    )}
                    {payment.receiptNumber && payment.paidAt && (
                      <InvoiceDownload payment={payment} onError={onError} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.payments.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No payments yet. Your receipts will appear here.
          </p>
        )}
      </div>
    </section>
  )
}

