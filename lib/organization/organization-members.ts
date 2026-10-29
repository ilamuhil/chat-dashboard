import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

export type OrganizationRole = 'admin' | 'editor'

export async function requireOrganizationMembership(
  requiredRole?: OrganizationRole,
) {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    throw new Error('No organization selected')
  }

  const membership = await prisma.organizationMembers.findFirst({
    where: { organizationId, userId },
    select: { id: true, role: true },
  })

  if (!membership) {
    throw new Error('You are not a member of this organization')
  }

  const role: OrganizationRole =
    membership.role === 'admin' ? 'admin' : 'editor'

  if (requiredRole && role !== requiredRole) {
    throw new Error('Only organization admins can perform this action')
  }

  return { userId, organizationId, membershipId: membership.id, role }
}

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return value === 'admin' || value === 'editor'
}
