export const INDIAN_STATES = [
  ['01', 'Jammu and Kashmir'],
  ['02', 'Himachal Pradesh'],
  ['03', 'Punjab'],
  ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'],
  ['06', 'Haryana'],
  ['07', 'Delhi'],
  ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'],
  ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'],
  ['14', 'Manipur'],
  ['15', 'Mizoram'],
  ['16', 'Tripura'],
  ['17', 'Meghalaya'],
  ['18', 'Assam'],
  ['19', 'West Bengal'],
  ['20', 'Jharkhand'],
  ['21', 'Odisha'],
  ['22', 'Chhattisgarh'],
  ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'],
  ['26', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['27', 'Maharashtra'],
  ['29', 'Karnataka'],
  ['30', 'Goa'],
  ['31', 'Lakshadweep'],
  ['32', 'Kerala'],
  ['33', 'Tamil Nadu'],
  ['34', 'Puducherry'],
  ['35', 'Andaman and Nicobar Islands'],
  ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'],
  ['38', 'Ladakh'],
] as const
export function validState(code: string) {
  return INDIAN_STATES.some(([value]) => value === code)
}
export function stateName(code: string) {
  return INDIAN_STATES.find(([value]) => value === code)?.[1] || code
}
export type GstBreakdown = {
  kind: 'none' | 'igst' | 'cgst_sgst' | 'cgst_utgst'
  supplierState: string
  placeOfSupply: string
  rateBps: number
  cgstPaise: number
  sgstPaise: number
  utgstPaise: number
  igstPaise: number
}
export function gstBreakdown(
  taxPaise: number,
  rateBps: number,
  supplierState: string,
  placeOfSupply: string,
): GstBreakdown {
  if (
    !Number.isSafeInteger(taxPaise) ||
    taxPaise < 0 ||
    !Number.isInteger(rateBps) ||
    rateBps < 0
  )
    throw new Error('Invalid tax amount')
  const result: GstBreakdown = {
    kind: 'none',
    supplierState,
    placeOfSupply,
    rateBps,
    cgstPaise: 0,
    sgstPaise: 0,
    utgstPaise: 0,
    igstPaise: 0,
  }
  if (taxPaise === 0) return result
  if (!validState(supplierState) || !validState(placeOfSupply))
    throw new Error('Select the billing state before calculating GST.')
  if (supplierState !== placeOfSupply)
    return { ...result, kind: 'igst', igstPaise: taxPaise }
  const unionTerritory = ['04', '26', '31', '35', '38'].includes(placeOfSupply)
  const central = Math.round(taxPaise / 2)
  return {
    ...result,
    kind: unionTerritory ? 'cgst_utgst' : 'cgst_sgst',
    cgstPaise: central,
    ...(unionTerritory
      ? { utgstPaise: taxPaise - central }
      : { sgstPaise: taxPaise - central }),
  }
}
export const INVOICE_DELAY_MS = 7 * 86400000
export function invoiceAvailableAt(paidAt: Date | string) {
  return new Date(new Date(paidAt).getTime() + INVOICE_DELAY_MS)
}
