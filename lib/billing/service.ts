import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/core/prisma'
import type { Prisma } from '@/generated/prisma/client'
import { PLANS, PLAN_VERSION, type Limits, type PlanId } from './catalog'

export type BillingTx = Prisma.TransactionClient
export class BillingError extends Error {
  constructor(
    message: string,
    public status = 409,
    public code = 'billing_limit',
  ) {
    super(message)
    this.name = 'BillingError'
  }
}
export async function ensureBilling(tx: BillingTx, organizationId: string) {
  await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId} FOR UPDATE`
  await tx.$queryRaw`SELECT organization_id FROM billing_accounts WHERE organization_id = ${organizationId} FOR UPDATE`
  const existing = await tx.billingAccount.findUnique({
    where: { organizationId },
  })
  if (existing) return existing
  const owner = await tx.organizationMembers.findFirst({
    where: { organizationId, role: 'admin' },
    orderBy: { createdAt: 'asc' },
  })
  const now = new Date()
  let eligible = false
  if (owner?.userId) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${owner.userId}::uuid FOR UPDATE`
    eligible = !(await tx.billingTrialClaim.findUnique({
      where: { userId: owner.userId },
    }))
  }
  const endsAt = new Date(now.getTime() + (eligible ? 14 * 86400000 : 0))
  await tx.billingAccount.create({
    data: {
      organizationId,
      planVersion: PLAN_VERSION,
      limits: PLANS.trial.limits,
      status: eligible ? 'trialing' : 'expired',
      trialEndsAt: endsAt,
    },
  })
  if (eligible && owner?.userId)
    await tx.billingTrialClaim.create({
      data: { userId: owner.userId, organizationId },
    })
  const period = await tx.billingPeriod.create({
    data: {
      id: randomUUID(),
      organizationId,
      planId: 'trial',
      planVersion: PLAN_VERSION,
      startsAt: now,
      endsAt,
      replyLimit: eligible ? PLANS.trial.limits.replies : 0,
      trainingLimit: eligible ? PLANS.trial.limits.trainingTokens : 0,
    },
  })
  return tx.billingAccount.update({
    where: { organizationId },
    data: { currentPeriodId: period.id },
  })
}
export function hasAccess(
  account: {
    status: string
    paidThrough: Date | null
    trialEndsAt: Date
    graceUntil: Date | null
  },
  now = new Date(),
) {
  if (account.status === 'trialing') return account.trialEndsAt > now
  return (
    Boolean(account.paidThrough && account.paidThrough > now) ||
    (account.status === 'past_due' &&
      Boolean(account.graceUntil && account.graceUntil > now))
  )
}
export async function assertCapacity(
  tx: BillingTx,
  orgId: string,
  resource: 'bots' | 'members' | 'sources' | 'storageBytes',
  additional = 1,
) {
  const account = await ensureBilling(tx, orgId)
  if (!hasAccess(account))
    throw new BillingError(
      'Your plan has ended. Choose a plan in Billing to continue.',
      402,
      'plan_expired',
    )
  const limits = { ...(account.limits as Limits) }
  if (account.pendingPlanId && account.pendingPlanId in PLANS) {
    const next = PLANS[account.pendingPlanId as PlanId].limits
    for (const key of Object.keys(limits) as (keyof Limits)[])
      limits[key] = Math.min(limits[key], next[key])
  }
  let used = 0
  if (resource === 'bots')
    used = await tx.bots.count({
      where: { organizationId: orgId, deletedAt: null },
    })
  if (resource === 'members') {
    used = await tx.organizationMembers.count({
      where: { organizationId: orgId },
    })
    used += await tx.organizationInvites.count({
      where: {
        organizationId: orgId,
        acceptedAt: null,
        createdAt: { gt: new Date(Date.now() - 14 * 86400000) },
      },
    })
  }
  if (resource === 'sources')
    used = await tx.trainingSources.count({
      where: { organizationId: orgId, deletedAt: null },
    })
  if (resource === 'storageBytes') {
    const files = await tx.files.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { path: true, sizeBytes: true },
    })
    const pending = await tx.trainingSources.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'pending',
        type: 'file',
      },
      select: { sourceValue: true, sizeBytes: true },
    })
    const byPath = new Map<string, number>()
    for (const file of files)
      byPath.set(file.path || randomUUID(), Number(file.sizeBytes || 0))
    for (const source of pending)
      if (source.sourceValue && !byPath.has(source.sourceValue))
        byPath.set(source.sourceValue, Number(source.sizeBytes || 0))
    used = [...byPath.values()].reduce((a, b) => a + b, 0)
  }
  if (used + additional > limits[resource])
    throw new BillingError(
      `Your ${PLANS[account.planId as PlanId]?.name || 'current'} plan's ${resource === 'storageBytes' ? 'storage' : resource} limit has been reached. Free up capacity or change your plan in Billing.`,
    )
  return { ...account, limits }
}
export function withBillingLock<T>(
  orgId: string,
  action: (tx: BillingTx) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await ensureBilling(tx, orgId)
      return action(tx)
    },
    { maxWait: 15000, timeout: 30000 },
  )
}
export async function billingSummary(orgId: string) {
  const account = await withBillingLock(orgId, (tx) => ensureBilling(tx, orgId))
  const [
    organization,
    period,
    payments,
    packs,
    checkouts,
    members,
    bots,
    files,
    sources,
    corpus,
    leads,
  ] = await Promise.all([
    prisma.organizations.findUnique({
      where: { id: orgId },
      select: { name: true, email: true, phone: true, address: true },
    }),
    account.currentPeriodId
      ? prisma.billingPeriod.findUnique({
          where: { id: account.currentPeriodId },
        })
      : null,
    prisma.billingPayment.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    prisma.billingCreditPack.findMany({
      where: {
        organizationId: orgId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    }),
    prisma.billingCheckout.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        kind: true,
        planId: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        subtotalPaise: true,
        taxPaise: true,
        totalPaise: true,
        taxBps: true,
        billingSnapshot: true,
      },
    }),
    prisma.organizationMembers.count({ where: { organizationId: orgId } }),
    prisma.bots.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.files.aggregate({
      where: { organizationId: orgId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
    prisma.trainingSources.count({
      where: { organizationId: orgId, deletedAt: null },
    }),
    prisma.$queryRaw<
      { tokens: bigint; pending: bigint }[]
    >`SELECT coalesce(sum(b.tokens),0)::bigint AS tokens, coalesce(sum(b.pending_tokens),0)::bigint AS pending FROM billing_source_usage b JOIN training_sources s ON s.id=b.source_id WHERE b.organization_id=${orgId} AND s.deleted_at IS NULL`,
    prisma.leads.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        capturedAt: {
          gte: account.currentPeriodId
            ? (
                await prisma.billingPeriod.findUnique({
                  where: { id: account.currentPeriodId },
                  select: { startsAt: true },
                })
              )?.startsAt || account.createdAt
            : account.createdAt,
        },
      },
    }),
  ])
  return {
    account,
    organization,
    period,
    payments,
    packs,
    checkouts,
    active: hasAccess(account),
    usage: {
      members,
      bots,
      storageBytes: files._sum.sizeBytes || BigInt(0),
      sources,
      corpusTokens: corpus[0]?.tokens || BigInt(0),
      pendingCorpusTokens: corpus[0]?.pending || BigInt(0),
      leads,
    },
  }
}
export function jsonSafe(value: unknown) {
  return JSON.parse(
    JSON.stringify(value, (_, item) =>
      typeof item === 'bigint' ? Number(item) : item,
    ),
  )
}
