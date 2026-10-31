import { prisma } from '@/lib/core/prisma'
import { canManageRole, OrganizationRole } from './permissions'
export async function changeMembership(
  organizationId: string,
  userId: string,
  targetId: string,
  nextRole?: OrganizationRole,
) {
  return prisma.$transaction(async (tx) => {
    // All owner transitions serialize on the organization, including parallel requests.
    await tx.$queryRaw`SELECT id FROM public.organizations WHERE id=${organizationId} FOR UPDATE`
    const actor = await tx.organizationMembers.findFirst({
      where: { organizationId, userId },
      select: { role: true },
    })
    const target = await tx.organizationMembers.findFirst({
      where: { id: targetId, organizationId },
      select: { id: true, userId: true, role: true },
    })
    if (
      !target ||
      target.userId === userId ||
      !canManageRole(actor?.role, target.role, nextRole)
    )
      throw new Error(
        'Only authorized administrators can change this membership',
      )
    if (
      target.role === OrganizationRole.Owner &&
      nextRole !== OrganizationRole.Owner &&
      (await tx.organizationMembers.count({
        where: { organizationId, role: OrganizationRole.Owner },
      })) <= 1
    )
      throw new Error('Only another Owner can remove or demote the last Owner')
    await tx.$executeRaw`SELECT set_config('app.actor_id', ${userId}, true)`
    return nextRole
      ? tx.organizationMembers.update({
          where: { id: targetId },
          data: { role: nextRole },
          select: { id: true, role: true },
        })
      : tx.organizationMembers.delete({
          where: { id: targetId },
          select: { id: true, role: true },
        })
  })
}
