import { prisma } from '@/lib/core/prisma'
import { requireAuthUserId } from '@/lib/auth/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/organization/current-organization'

import {
  can,
  isOrganizationRole,
  OrganizationRole,
  type Permission,
} from './permissions'
export { isOrganizationRole } from './permissions'
export type { OrganizationRole } from './permissions'

export async function requireOrganizationMembership(
  requiredRole?: OrganizationRole,
) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    throw new Error('No organization selected')
  }

  const membership = await prisma.organizationMembers.findFirst({
    where: {
      organizationId,
      userId,
      user: { isActive: true, isBanned: false },
    },
    select: { id: true, role: true },
  })

  if (!membership) {
    throw new Error('You are not a member of this organization')
  }

  if (!isOrganizationRole(membership.role))
    throw new Error(
      'Only organization members with a valid role can access this organization',
    )
  const role = membership.role

  if (
    requiredRole &&
    !(requiredRole === OrganizationRole.Admin
      ? can(role, 'configure')
      : role === requiredRole)
  ) {
    throw new Error('Only organization admins can perform this action')
  }

  return { userId, organizationId, membershipId: membership.id, role }
}

export async function requireOrganizationPermission(permission: Permission) {
  const actor = await requireOrganizationMembership()
  if (!can(actor.role, permission))
    throw new Error(
      'Only organization members with permission can perform this action',
    )
  return actor
}

export async function readOrganizationRole(
  organizationId: string,
  userId: string,
) {
  const member = await prisma.organizationMembers.findFirst({
    where: {
      organizationId,
      userId,
      user: { isActive: true, isBanned: false },
    },
    select: { role: true },
  })
  if (!isOrganizationRole(member?.role))
    throw new Error('Only active organization members may receive staff tokens')
  return member.role
}
