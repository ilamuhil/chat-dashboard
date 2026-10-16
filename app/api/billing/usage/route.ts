import { NextRequest, NextResponse } from 'next/server'
import { billingActor } from '@/lib/billing/guards'
import { prisma } from '@/lib/prisma'
import { ensureBilling, hasAccess, withBillingLock, BillingError } from '@/lib/billing/service'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  try {
    const actor = await billingActor(request, false)
    const account = await prisma.billingAccount.findUnique({ where: { organizationId: actor.organizationId } }) || await withBillingLock(actor.organizationId, tx => ensureBilling(tx, actor.organizationId))
    const period = account.currentPeriodId ? await prisma.billingPeriod.findUnique({ where: { id: account.currentPeriodId } }) : null
    const packs = await prisma.billingCreditPack.findMany({ where: { organizationId: actor.organizationId, revoked: false, expiresAt: { gt: new Date() } }, select: { replies: true, used: true, reserved: true } })
    return NextResponse.json({ active: hasAccess(account), status: account.status, used: (period?.repliesUsed || 0) + (period?.repliesReserved || 0), limit: period?.replyLimit || 0, extra: packs.reduce((total, pack) => total + pack.replies - pack.used - pack.reserved, 0), graceUntil: account.graceUntil, expiry: account.paidThrough || account.trialEndsAt }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return NextResponse.json({ error: 'Usage is temporarily unavailable.' }, { status: error instanceof BillingError ? error.status : 503 }) }
}
