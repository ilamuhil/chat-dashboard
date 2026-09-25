import { redirect } from 'next/navigation'

import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import OrganizationSelection from './OrganizationSelection'

export default async function SelectOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ preferred?: string }>
}) {
  const userId = await requireAuthUserId()
  const { preferred } = await searchParams
  const memberships = await prisma.organizationMembers.findMany({
    where: { userId },
    select: {
      organizationId: true,
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const organizations = memberships
    .filter(
      (membership): membership is typeof membership & {
        organizationId: string
      } => Boolean(membership.organizationId),
    )
    .map(membership => ({
      id: membership.organizationId,
      name: membership.organization?.name || 'Organization',
    }))

  if (organizations.length === 0) {
    redirect('/auth/login')
  }
  if (organizations.length === 1) {
    redirect('/dashboard')
  }

  return (
    <OrganizationSelection
      organizations={organizations}
      preferredOrganizationId={preferred}
    />
  )
}
