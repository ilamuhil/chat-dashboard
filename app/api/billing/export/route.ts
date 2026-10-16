import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { billingActor } from '@/lib/billing/guards'
import { getSecretKey, signToken } from '@/lib/jwt'
import { BillingError, jsonSafe } from '@/lib/billing/service'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  try {
    const actor = await billingActor(request)
    const [organization, bots, leads, conversations, trainingSources, files] =
      await Promise.all([
        prisma.organizations.findUnique({
          where: { id: actor.organizationId },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        }),
        prisma.bots.findMany({
          where: { organizationId: actor.organizationId, deletedAt: null },
        }),
        prisma.leads.findMany({
          where: { organizationId: actor.organizationId, deletedAt: null },
          include: { leadFollowUps: true },
        }),
        prisma.conversationsMeta.findMany({
          where: { organizationId: actor.organizationId },
        }),
        prisma.trainingSources.findMany({
          where: { organizationId: actor.organizationId, deletedAt: null },
        }),
        prisma.files.findMany({
          where: { organizationId: actor.organizationId, deletedAt: null },
        }),
      ])
    const key = getSecretKey()
    if (!key) throw new Error('Chat export authentication is unavailable')
    const token = signToken(
      {
        organization_id: actor.organizationId,
        user_id: actor.userId,
        role: 'billing_export',
        type: 'support_agent',
        bot_id: 'billing-export',
      },
      key,
      300,
    )
    const base =
      process.env.PYTHON_API_URL || process.env.NEXT_PUBLIC_PYTHON_SERVER_URL
    const response = await fetch(`${base}/api/billing/export`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(60000),
    })
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            'Conversation export is temporarily unavailable. Please try again; no incomplete export was generated.',
        },
        { status: 503 },
      )
    const chat = await response.json()
    return new NextResponse(
      JSON.stringify(
        jsonSafe({
          exportedAt: new Date().toISOString(),
          organization,
          bots,
          leads,
          conversations,
          trainingSources,
          files,
          chat,
        }),
        null,
        2,
      ),
      {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition':
            'attachment; filename="organization-export.json"',
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof BillingError
            ? error.message
            : 'Export is temporarily unavailable. Please try again; no incomplete export was generated.',
      },
      { status: error instanceof BillingError ? error.status : 503 },
    )
  }
}
