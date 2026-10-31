import { canManageRole } from '@/lib/organization/permissions'
import { OrganizationRole } from '@/lib/organization/roles'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/core/prisma'
import {
  withBillingLock,
  assertCapacity,
  BillingError,
} from '@/lib/billing/service'
import { requireOrganizationMembership } from '@/lib/organization/organization-members'
import { createMagicLink } from '@/lib/auth/magic-link'
import { sendOrganizationMagicLinkEmail } from '@/lib/email/email'

export const runtime = 'nodejs'

const inviteSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email(),
  role: z.enum(OrganizationRole),
})

function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:4000'
  ).replace(/\/$/, '')
}

export async function GET() {
  try {
    const { organizationId, userId } = await requireOrganizationMembership()

    const members = await prisma.organizationMembers.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({
      members: members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt.toISOString(),
        isSelf: member.user?.id === userId,
        user: member.user,
      })),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not load organization members'
    const status =
      message.includes('Only') || message.includes('member') ? 403 : 401
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireOrganizationMembership(OrganizationRole.Admin)
    const body = inviteSchema.parse(await request.json())
    if (!canManageRole(actor.role, OrganizationRole.Viewer, body.role))
      return NextResponse.json(
        { error: 'Only Owners can invite Admins or Owners' },
        { status: 403 },
      )
    const fullName = body.fullName.trim()
    const email = body.email.trim().toLowerCase()

    let user = await prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true, isBanned: true },
    })

    if (user?.isBanned || user?.isActive === false) {
      return NextResponse.json(
        { error: 'This user account is not available.' },
        { status: 409 },
      )
    }

    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          fullName,
          emailVerified: false,
          onboardingCompleted: true,
        },
        select: { id: true, email: true, isActive: true, isBanned: true },
      })
    }

    if (user.id === actor.userId) {
      return NextResponse.json(
        { error: 'You are already a member of this organization.' },
        { status: 409 },
      )
    }

    await withBillingLock(actor.organizationId, async (tx) => {
      const currentActor = await tx.organizationMembers.findFirst({
        where: { organizationId: actor.organizationId, userId: actor.userId },
        select: { role: true },
      })
      if (
        !canManageRole(currentActor?.role, OrganizationRole.Viewer, body.role)
      )
        throw new Error('Only authorized administrators can invite this role')
      const alreadyMember = await tx.organizationMembers.findFirst({
        where: { organizationId: actor.organizationId, userId: user.id },
      })
      if (alreadyMember)
        throw new BillingError(
          'This person is already a member. Use Change role instead.',
          409,
        )
      await assertCapacity(tx, actor.organizationId, 'members')
      await tx.organizationMembers.create({
        data: {
          organizationId: actor.organizationId,
          userId: user.id,
          role: body.role,
        },
      })
    })

    const organization = await prisma.organizations.findUnique({
      where: { id: actor.organizationId },
      select: { name: true },
    })
    const inviter = await prisma.users.findUnique({
      where: { id: actor.userId },
      select: { fullName: true, email: true },
    })
    const magicLink = await createMagicLink({
      userId: user.id,
      organizationId: actor.organizationId,
    })
    const url = `${getAppUrl()}/api/auth/magic-link?token=${encodeURIComponent(magicLink.token)}`

    await sendOrganizationMagicLinkEmail({
      to: email,
      magicLink: url,
      organizationName: organization?.name || 'your organization',
      inviterName:
        inviter?.fullName?.trim() ||
        inviter?.email ||
        'An organization administrator',
      expiresInMinutes: magicLink.expiresInMinutes,
    })

    const inviterDisplayName =
      inviter?.fullName?.trim() ||
      inviter?.email ||
      'An organization administrator'
    await prisma.notifications.create({
      data: {
        userId: user.id,
        organizationId: actor.organizationId,
        type: 'organization_invitation',
        title: 'You were invited to an organization',
        body: `${inviterDisplayName} invited you to join ${organization?.name || 'an organization'} as an ${body.role}.`,
        metadata: {
          inviterName: inviterDisplayName,
          role: body.role,
        },
        channels: ['dashboard', 'email'],
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Invitation sent successfully.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid invitation details.' },
        { status: 400 },
      )
    }
    const message =
      error instanceof Error ? error.message : 'Could not invite user'
    const status =
      error instanceof BillingError
        ? error.status
        : message.includes('Only')
          ? 403
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
