import { prisma } from '@/lib/core/prisma'
import { OrganizationRole } from '@/lib/organization/roles'
import { reconcileCheckout, processCashfreeEvent } from './payments'
import { PLANS, type PlanId } from './catalog'
import { withBillingLock, ensureBilling } from './service'

async function notify(orgId: string, id: string, title: string, body: string) {
  await withBillingLock(orgId, async (tx) => {
    if (await tx.billingNotice.findUnique({ where: { id } })) return
    const admins = await tx.organizationMembers.findMany({
      where: {
        organizationId: orgId,
        role: OrganizationRole.Owner,
        userId: { not: null },
      },
    })
    await tx.notifications.createMany({
      data: admins.map((member) => ({
        organizationId: orgId,
        userId: member.userId,
        type: 'billing',
        title,
        body,
        metadata: { url: '/dashboard/subscription' },
        channels: ['dashboard'],
      })),
    })
    await tx.billingNotice.create({
      data: { id, organizationId: orgId, kind: title, sentAt: new Date() },
    })
  })
}
export async function maintainBilling() {
  const organizations = await prisma.organizations.findMany({
    select: { id: true },
  })
  let reconciled = 0
  let failures = 0
  for (const org of organizations) {
    const account = await withBillingLock(org.id, (tx) =>
      ensureBilling(tx, org.id),
    )
    const checkouts = await prisma.billingCheckout.findMany({
      where: {
        organizationId: org.id,
        status: { notIn: ['cancelled', 'user_dropped', 'paid', 'failed'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })
    for (const checkout of checkouts) {
      try {
        await reconcileCheckout(checkout.id, org.id)
        reconciled++
      } catch {
        failures++
      }
    }
    const period = account.currentPeriodId
      ? await prisma.billingPeriod.findUnique({
          where: { id: account.currentPeriodId },
        })
      : null
    if (period && period.replyLimit > 0) {
      const percentage = (period.repliesUsed / period.replyLimit) * 100
      for (const threshold of [80, 95, 100])
        if (percentage >= threshold)
          await notify(
            org.id,
            `usage:${period.id}:${threshold}`,
            `${threshold}% of AI replies used`,
            threshold === 100
              ? 'AI replies are paused unless additional credits are available. Contact capture and human handoff remain available.'
              : 'Review your remaining replies and renewal date in Billing & usage.',
          )
    }
    if (account.status === 'past_due')
      await notify(
        org.id,
        `past_due:${account.currentPeriodId}`,
        'Renewal payment needs attention',
        'Your renewal was not collected. Open Billing & usage to review the payment and recover access.',
      )
    const expiry = account.paidThrough || account.trialEndsAt
    if (
      expiry.getTime() - Date.now() < 2 * 86400000 &&
      expiry.getTime() > Date.now()
    )
      await notify(
        org.id,
        `renewal:${account.currentPeriodId}`,
        account.planId === 'trial'
          ? 'Your trial ends soon'
          : account.cancelAtPeriodEnd
            ? 'Your paid access ends soon'
            : 'Your subscription renews soon',
        `Review your plan and payment details before ${expiry.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.`,
      )
    const leads = await prisma.leads.count({
      where: {
        organizationId: org.id,
        capturedAt: { gte: period?.startsAt || account.createdAt },
        deletedAt: null,
      },
    })
    const limit = PLANS[account.planId as PlanId]?.limits.leadAlert || 50
    if (leads >= limit)
      await notify(
        org.id,
        `leads:${account.currentPeriodId}`,
        'Your lead volume is growing',
        'Lead capture continues. Review your team capacity and follow-up workload; no separate monthly lead fee has been added.',
      )
  }
  const pendingEvents = await prisma.billingEvent.findMany({
    where: { processedAt: null },
    orderBy: { receivedAt: 'asc' },
    take: 50,
  })
  for (const event of pendingEvents) {
    try {
      await processCashfreeEvent(event.payload, event.id)
    } catch {
      failures++
    }
  }
  return { organizations: organizations.length, reconciled, failures }
}
