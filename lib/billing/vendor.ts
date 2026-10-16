import { cashfreeMode } from './cashfree'
import { record, string } from './events'
import { gstBreakdown, validState } from './tax'
export const SAMPLE_VENDOR = {
  name: 'Sample Chat Software Private Limited',
  address: '123 Sample Technology Park\nBengaluru, Karnataka 560001, India',
  gstin: '29ABCDE1234F1Z5',
  stateCode: '29',
  support: 'billing@example.invalid',
  sac: '998314',
  sample: true,
}
export function billingVendor() {
  const sandbox = cashfreeMode() === 'sandbox'
  const vendor = {
    name:
      process.env.BILLING_BUSINESS_NAME || (sandbox ? SAMPLE_VENDOR.name : ''),
    address:
      process.env.BILLING_BUSINESS_ADDRESS ||
      (sandbox ? SAMPLE_VENDOR.address : ''),
    gstin: process.env.BILLING_GSTIN || (sandbox ? SAMPLE_VENDOR.gstin : ''),
    stateCode: process.env.BILLING_STATE_CODE || (sandbox ? '29' : ''),
    support:
      process.env.BILLING_SUPPORT_EMAIL ||
      (sandbox ? SAMPLE_VENDOR.support : ''),
    sac: process.env.BILLING_SAC || (sandbox ? SAMPLE_VENDOR.sac : ''),
    sample: sandbox || process.env.BILLING_VENDOR_IS_SAMPLE === 'true',
  }
  if (
    !sandbox &&
    (vendor.sample ||
      !vendor.name ||
      !vendor.address ||
      !vendor.gstin ||
      !validState(vendor.stateCode) ||
      !vendor.sac)
  )
    throw new Error(
      'Complete vendor billing configuration before enabling live payments.',
    )
  return vendor
}
export function customerState(value: unknown) {
  const details = record(value)
  const explicit = string(details.stateCode)
  const gstState = string(details.gstin).slice(0, 2)
  if (explicit && gstState && explicit !== gstState)
    throw new Error('The billing state must match the customer GSTIN.')
  const state = explicit || gstState
  if (!validState(state))
    throw new Error(
      'Select your billing state in Billing details before checkout.',
    )
  return state
}
export function taxForCustomer(
  taxPaise: number,
  rateBps: number,
  details: unknown,
) {
  return gstBreakdown(
    taxPaise,
    rateBps,
    billingVendor().stateCode,
    taxPaise ? customerState(details) : string(record(details).stateCode),
  )
}
