import type { TaxQuote } from '@/components/billing-tax-breakdown'
import { creditPackPrice } from '@/lib/billing/catalog'

export const date = (value: string | Date | null) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—'

export function packQuote(quote: TaxQuote, replies: number): TaxQuote {
  const tax = quote.taxBreakdown
  const subtotalPaise = creditPackPrice(replies)
  const rateBps =
    tax?.rateBps ||
    (quote.subtotalPaise
      ? Math.round((quote.taxPaise * 10000) / quote.subtotalPaise)
      : 0)
  const taxPaise = Math.round((subtotalPaise * rateBps) / 10000)
  const central = Math.round(taxPaise / 2)
  return {
    subtotalPaise,
    taxPaise,
    totalPaise: subtotalPaise + taxPaise,
    taxBreakdown: tax
      ? {
          ...tax,
          cgstPaise:
            tax.kind === 'cgst_sgst' || tax.kind === 'cgst_utgst'
              ? central
              : 0,
          sgstPaise: tax.kind === 'cgst_sgst' ? taxPaise - central : 0,
          utgstPaise: tax.kind === 'cgst_utgst' ? taxPaise - central : 0,
          igstPaise: tax.kind === 'igst' ? taxPaise : 0,
        }
      : tax,
  }
}

export async function billingRequest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch('/api/billing', {
    method,
    cache: 'no-store',
    signal,
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }),
  })
  const data = await response.json()
  if (!response.ok)
    throw new Error(data.error || 'Could not complete this billing request.')
  return data as T
}

export async function fetchInvoice(paymentId: string) {
  const response = await fetch(
    `/api/billing/invoices/${encodeURIComponent(paymentId)}`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const body = await response.json()
    throw new Error(body.error || 'Could not download the invoice.')
  }
  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get('content-disposition')
        ?.match(/filename="([^"]+)"/)?.[1] || 'invoice.pdf',
  }
}

export type MessageTone = 'info' | 'success' | 'warning' | 'error'

export function checkoutMessage(status?: string): {
  tone: MessageTone
  message: string
} | null {
  if (status === 'failed')
    return {
      tone: 'error',
      message:
        'Payment failed. No allowance was added. Review the payment details below and try again.',
    }
  if (status === 'user_dropped' || status === 'cancelled')
    return {
      tone: 'warning',
      message:
        status === 'user_dropped'
          ? 'You left the payment checkout before completing payment. No charge was made. You can try again when ready.'
          : 'Payment was cancelled before completion. No charge was made. You can try again when ready.',
    }
  if (status === 'active' || status === 'paid')
    return {
      tone: 'success',
      message: 'Payment verified. Your updated allowance is ready.',
    }
  return null
}

