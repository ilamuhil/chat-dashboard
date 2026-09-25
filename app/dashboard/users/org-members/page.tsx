import { notFound } from 'next/navigation'

import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import OrganizationMembersClient from './OrganizationMembersClient'

export default async function OrganizationMembersPage() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) notFound()

  const membership = await prisma.organizationMembers.findFirst({
    where: { organizationId, userId },
    select: { role: true },
  })

  if (!membership) notFound()

  return (
    <OrganizationMembersClient
      canManage={membership.role === 'admin'}
    />
  )
}
