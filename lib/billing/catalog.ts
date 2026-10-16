export type PlanId = 'trial' | 'starter' | 'growth'
export type Limits = {
  replies: number
  members: number
  bots: number
  storageBytes: number
  fileBytes: number
  sources: number
  corpusTokens: number
  trainingTokens: number
  transcriptDays: number
  leadDays: number
  leadAlert: number
}
export const PLAN_VERSION = '2026-10-16'
const MB = 1_000_000
export const PLANS: Record<
  PlanId,
  {
    id: PlanId
    name: string
    pricePaise: number
    description: string
    limits: Limits
  }
> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    pricePaise: 0,
    description: 'Try your admissions assistant for 14 days.',
    limits: {
      replies: 100,
      members: 1,
      bots: 1,
      storageBytes: 20 * MB,
      fileBytes: 10 * MB,
      sources: 5,
      corpusTokens: 50_000,
      trainingTokens: 100_000,
      transcriptDays: 30,
      leadDays: 30,
      leadAlert: 50,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    pricePaise: 199900,
    description: 'One institute, one assistant, a small team.',
    limits: {
      replies: 1000,
      members: 3,
      bots: 1,
      storageBytes: 100 * MB,
      fileBytes: 10 * MB,
      sources: 20,
      corpusTokens: 500_000,
      trainingTokens: 1_000_000,
      transcriptDays: 90,
      leadDays: 365,
      leadAlert: 1000,
    },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    pricePaise: 499900,
    description: 'More assistants and capacity for your team.',
    limits: {
      replies: 4000,
      members: 10,
      bots: 3,
      storageBytes: 500 * MB,
      fileBytes: 25 * MB,
      sources: 100,
      corpusTokens: 2_000_000,
      trainingTokens: 4_000_000,
      transcriptDays: 180,
      leadDays: 365,
      leadAlert: 5000,
    },
  },
}
export const CREDIT_PACK = {
  pricePaise: 69900,
  replies: 1000,
  minReplies: 1000,
  maxReplies: 10000,
  stepReplies: 500,
  expiryDays: 90,
}
export function creditPackPrice(replies: number) {
  if (
    !Number.isInteger(replies) ||
    replies < CREDIT_PACK.minReplies ||
    replies > CREDIT_PACK.maxReplies ||
    replies % CREDIT_PACK.stepReplies !== 0
  )
    throw new Error('Invalid reply add-on quantity')
  return (
    Math.ceil(
      (CREDIT_PACK.pricePaise * replies) / CREDIT_PACK.replies / 100,
    ) * 100
  )
}
export function isPaidPlan(value: unknown): value is 'starter' | 'growth' {
  return value === 'starter' || value === 'growth'
}
export function money(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100)
}
export function nextMonth(date: Date) {
  const next = new Date(date)
  const day = date.getUTCDate()
  next.setUTCDate(1)
  next.setUTCMonth(next.getUTCMonth() + 1)
  next.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  )
  return next
}
export function quote(pricePaise: number, taxBps = 0) {
  if (!Number.isInteger(taxBps) || taxBps < 0 || taxBps > 10000)
    throw new Error('Invalid billing tax configuration')
  const taxPaise = Math.round((pricePaise * taxBps) / 10000)
  return {
    subtotalPaise: pricePaise,
    taxPaise,
    totalPaise: pricePaise + taxPaise,
    taxBps,
  }
}
