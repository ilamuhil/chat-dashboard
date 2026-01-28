import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export const CURRENT_ORG_COOKIE = 'current_organization_id'

export async function getSelectedOrganizationIdFromCookie(): Promise<
  string | undefined
> {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_ORG_COOKIE)?.value
}

export async function resolveCurrentOrganizationId(opts: {
  userId: string
}): Promise<string | null> {
  const selected = await getSelectedOrganizationIdFromCookie()

  const memberships = await prisma.organizationMembers.findMany({
    where: { userId: opts.userId },
    select: { organizationId: true },
  })

  if (!memberships?.length) return null

  if (selected && memberships.some((m) => m.organizationId === selected)) {
    return selected
  }

  return memberships[0].organizationId ?? null
}


