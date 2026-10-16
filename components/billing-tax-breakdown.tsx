import { money } from '@/lib/billing/catalog'
import { stateName, type GstBreakdown } from '@/lib/billing/tax'
export type TaxQuote = {
  subtotalPaise: number
  taxPaise: number
  totalPaise: number
  taxBreakdown?: GstBreakdown | null
}
export function BillingTaxBreakdown({ quote }: { quote: TaxQuote }) {
  const tax = quote.taxBreakdown
  const rows: [string, string][] = [['Base value', money(quote.subtotalPaise)]]
  if (tax?.kind === 'igst')
    rows.push(
      [`IGST (${tax.rateBps / 100}%)`, money(tax.igstPaise)],
      ['CGST / SGST / UTGST', 'Not applicable'],
    )
  else if (tax?.kind === 'cgst_sgst' || tax?.kind === 'cgst_utgst')
    rows.push(
      [`CGST (${tax.rateBps / 200}%)`, money(tax.cgstPaise)],
      [
        `${tax.kind === 'cgst_utgst' ? 'UTGST' : 'SGST'} (${tax.rateBps / 200}%)`,
        money(tax.sgstPaise + tax.utgstPaise),
      ],
      ['IGST', 'Not applicable'],
    )
  else if (quote.taxPaise === 0) rows.push(['GST', 'Not charged'])
  rows.push(
    ['Total tax', money(quote.taxPaise)],
    ['Total', money(quote.totalPaise)],
  )
  return (
    <div>
      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className={`flex justify-between gap-4 ${label === 'Total' ? 'border-t border-border pt-3 font-semibold' : ''}`}
          >
            <dt>{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {tax?.placeOfSupply && (
        <p className="mt-3 text-xs text-muted-foreground">
          Place of supply: {stateName(tax.placeOfSupply)} ({tax.placeOfSupply})
        </p>
      )}
      {quote.taxPaise > 0 && !tax && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          Choose your billing state in Billing details to see the applicable GST
          components before checkout.
        </p>
      )}
    </div>
  )
}
