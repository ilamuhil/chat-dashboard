import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withBillingLock, assertCapacity } from '@/lib/billing/service'
import { getAuthUserIdFromCookies } from '@/lib/auth-server'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function GET() {
  const userId = await getAuthUserIdFromCookies()
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user?.email) return NextResponse.json({ ok: true, invites: [] })

  const invites = await prisma.organizationInvites.findMany({
    where: { email: user.email.toLowerCase(), acceptedAt: null, createdAt: { gt: new Date(Date.now() - 14 * 86400000) } },
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    ok: true,
    invites: invites.map((i) => ({
      id: i.id,
      organizationId: i.organizationId,
      organizationName: i.organization?.name ?? 'Organization',
      role: i.role,
      createdAt: i.createdAt.toISOString(),
    })),
  })
}

const acceptSchema = z.object({
  inviteId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const body = acceptSchema.parse(await request.json())
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'User email missing' }, { status: 400 })
    }

    const invite = await prisma.organizationInvites.findFirst({
      where: { id: body.inviteId, email: user.email.toLowerCase(), acceptedAt: null, createdAt: { gt: new Date(Date.now() - 14 * 86400000) } },
    })
    if (!invite) {
      return NextResponse.json({ ok: false, error: 'Invite not found' }, { status: 404 })
    }

    await withBillingLock(invite.organizationId, async tx => {
      const pending = await tx.organizationInvites.findFirst({ where: { id: invite.id, acceptedAt: null } })
      if (!pending) throw new Error('Invitation is no longer available')
      const existing = await tx.organizationMembers.findFirst({ where: { organizationId: invite.organizationId, userId } })
      if (!existing) {
        await assertCapacity(tx, invite.organizationId, 'members', 0)
        await tx.organizationMembers.create({ data: { organizationId: invite.organizationId, userId, role: invite.role } })
      }
      await tx.organizationInvites.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
    })

    await prisma.users.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    })

    const res = NextResponse.json({ ok: true, organizationId: invite.organizationId })
    res.cookies.set('current_organization_id', invite.organizationId, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to accept invite'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

