import { NextRequest } from 'next/server'
import { requireUserOrg } from '@/lib/auth/route-guards'
import { prisma } from '@/lib/core/prisma'
import { BillingError } from './service'

export async function billingActor(request: NextRequest, admin = true) {
  const auth = await requireUserOrg(request)
  if (!auth.ok)
    throw new BillingError('Please sign in and select an organization.', 401)
  const member = await prisma.organizationMembers.findFirst({
    where: { userId: auth.userId, organizationId: auth.organizationId },
  })
  if (!member || (admin && member.role !== 'admin'))
    throw new BillingError(
      'Only organization administrators can manage billing.',
      403,
    )
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin')
    const expected = new URL(process.env.APP_URL || request.url).origin
    if (!origin || origin !== expected)
      throw new BillingError(
        'This billing request must come from the application.',
        403,
      )
  }
  return { ...auth, role: member.role }
}
