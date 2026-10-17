import type { Limits, PlanId } from '@/lib/billing/catalog'
import type { TaxQuote } from '@/components/billing-tax-breakdown'

export type Details = {
  name: string
  email: string
  phone: string
  address: string
  gstin: string
  stateCode: string
}

export type Payment = {
  id: string
  status: string
  kind: string
  amountPaise: number
  paidAt: string | null
  receiptNumber: string | null
  invoiceNumber: string | null
  failureReason: string | null
  snapshot?: { demo?: boolean; planName?: string }
}

export type Summary = {
  account: {
    planId: PlanId
    status: string
    limits: Limits
    trialEndsAt: string
    paidThrough: string | null
    graceUntil: string | null
    cancelAtPeriodEnd: boolean
    pendingPlanId: PlanId | null
    providerSubscriptionId: string | null
    providerStatus: string | null
    billingDetails: Partial<Details>
  }
  organization: { name: string; email: string | null; phone: string | null }
  period: {
    replyLimit: number
    repliesUsed: number
    repliesReserved: number
    trainingUsed: number
    trainingReserved: number
    trainingLimit: number
    endsAt: string
  } | null
  usage: {
    members: number
    bots: number
    storageBytes: number
    sources: number
    corpusTokens: number
    leads: number
  }
  packs: {
    id: string
    replies: number
    used: number
    reserved: number
    expiresAt: string
  }[]
  payments: Payment[]
  checkouts: (TaxQuote & {
    id: string
    kind: string
    status: string
    planId: string
    expiresAt: string
    packReplies: number
  })[]
  active: boolean
  canManage: boolean
  mode: 'sandbox' | 'production'
  configured: boolean
  quotes: Record<'starter' | 'growth' | 'pack', TaxQuote>
}

export type BillingAction = Record<string, unknown> & { action: string }

export type BillingActionResult = {
  mode?: 'sandbox' | 'production'
  kind?: 'pack' | 'subscription'
  sessionId?: string
  checkoutStatus?: string
}

export type Confirmation = {
  action:
    | 'checkout'
    | 'change_plan'
    | 'cancel'
    | 'resume'
    | 'resume_change_plan'
  planId?: 'starter' | 'growth'
  kind?: 'pack' | 'subscription'
  packReplies?: number
}
