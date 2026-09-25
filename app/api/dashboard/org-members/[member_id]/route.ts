import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organization-members'
import {
  sendMembershipRemovedEmail,
  sendMembershipRoleUpdatedEmail,
} from '@/lib/email'

const roleSchema = z.object({
  role: z.enum(['admin', 'editor']),
})

async function getTargetMembership(organizationId: string, memberId: string) {
  return prisma.organizationMembers.findFirst({
    where: { id: memberId, organizationId },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { email: true, fullName: true } },
      organization: { select: { name: true } },
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ member_id: string }> },
) {
  try {
    const actor = await requireOrganizationMembership('admin')
    const { member_id: memberId } = await params
    const target = await getTargetMembership(actor.organizationId, memberId)

    if (!target || !target.userId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    if (target.userId === actor.userId) {
      return NextResponse.json(
        { error: 'You cannot change your own role.' },
        { status: 400 },
      )
    }

    const { role } = roleSchema.parse(await request.json())
    if (target.role === 'admin' && role === 'editor') {
      const adminCount = await prisma.organizationMembers.count({
        where: { organizationId: actor.organizationId, role: 'admin' },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'The last admin cannot be demoted.' },
          { status: 409 },
        )
      }
    }

    const administrator = await prisma.users.findUnique({
      where: { id: actor.userId },
      select: { fullName: true, email: true },
    })

    const member = await prisma.organizationMembers.update({
      where: { id: target.id },
      data: { role },
      select: { id: true, role: true },
    })

    if (target.user?.email) {
      await sendMembershipRoleUpdatedEmail({
        to: target.user.email,
        organizationName: target.organization?.name || 'the organization',
        role,
        administratorName:
          administrator?.fullName?.trim() ||
          administrator?.email ||
          'An organization administrator',
      })
    }

    await prisma.notifications.create({
      data: {
        userId: target.userId,
        organizationId: actor.organizationId,
        type: 'organization_role_updated',
        title: 'Your organization role was updated',
        body: `${administrator?.fullName?.trim() || administrator?.email || 'An organization administrator'} updated your role to ${role}.`,
        metadata: {
          role,
          administratorName:
            administrator?.fullName?.trim() || administrator?.email || null,
        },
        channels: ['dashboard', 'email'],
      },
    })

    return NextResponse.json({ ok: true, member })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    const message =
      error instanceof Error ? error.message : 'Could not update member'
    return NextResponse.json(
      { error: message },
      { status: message.includes('Only') ? 403 : 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ member_id: string }> },
) {
  try {
    const actor = await requireOrganizationMembership('admin')
    const { member_id: memberId } = await params
    const target = await getTargetMembership(actor.organizationId, memberId)

    if (!target || !target.userId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    if (target.userId === actor.userId) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the organization.' },
        { status: 400 },
      )
    }

    if (target.role === 'admin') {
      const adminCount = await prisma.organizationMembers.count({
        where: { organizationId: actor.organizationId, role: 'admin' },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'The last admin cannot be removed.' },
          { status: 409 },
        )
      }
    }

    const administrator = await prisma.users.findUnique({
      where: { id: actor.userId },
      select: { fullName: true, email: true },
    })

    await prisma.organizationMembers.delete({ where: { id: target.id } })

    const remainingMembership = await prisma.organizationMembers.findFirst({
      where: { userId: target.userId },
      select: { organizationId: true },
    })

    if (!remainingMembership) {
      await prisma.users.update({
        where: { id: target.userId },
        data: { onboardingCompleted: false },
      })
    }

    if (target.user?.email) {
      await sendMembershipRemovedEmail({
        to: target.user.email,
        organizationName: target.organization?.name || 'the organization',
        administratorName:
          administrator?.fullName?.trim() ||
          administrator?.email ||
          'an organization administrator',
      })
    }

    if (remainingMembership?.organizationId) {
      await prisma.notifications.create({
        data: {
          userId: target.userId,
          organizationId: remainingMembership.organizationId,
          type: 'organization_membership_removed',
          title: 'You were removed from an organization',
          body: `${administrator?.fullName?.trim() || administrator?.email || 'An organization administrator'} removed your access to ${target.organization?.name || 'the organization'}.`,
          metadata: {
            removedOrganizationId: actor.organizationId,
            administratorName:
              administrator?.fullName?.trim() || administrator?.email || null,
          },
          channels: ['dashboard', 'email'],
        },
      })
    }

    return NextResponse.json({
      ok: true,
      next:
        remainingMembership?.organizationId
          ? '/dashboard'
          : '/onboarding',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not remove member'
    return NextResponse.json(
      { error: message },
      { status: message.includes('Only') ? 403 : 500 },
    )
  }
}
