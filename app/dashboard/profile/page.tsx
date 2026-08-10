import ProfileForm from './ProfileForm'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { DashboardPageHeader } from '@/components/dashboard-page-header'

type OrganizationAddress = {
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
}

const emptyAddress: OrganizationAddress = {
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  country: null,
}

function isOrganizationAddress(value: unknown): value is OrganizationAddress {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const keys: (keyof OrganizationAddress)[] = [
    'address_line1',
    'address_line2',
    'city',
    'state',
    'zip',
    'country',
  ]
  return keys.every(key => {
    const field = record[key]
    return (
      field === null || typeof field === 'string' || typeof field === 'undefined'
    )
  })
}

export default async function ProfilePage() {
  const userId = await requireAuthUserId()

  const organizationId = await resolveCurrentOrganizationId({ userId })

  // Get organization data if user belongs to one
  let organization = null
  if (organizationId) {
    const org = await prisma.organizations.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
        address: true,
      },
    })
    if (org) {
      const address = isOrganizationAddress(org.address)
        ? org.address
        : emptyAddress
      organization = {
        id: org.id,
        name: org.name ?? '',
        email: org.email ?? null,
        phone: org.phone ?? null,
        logo_url: org.logoUrl ?? null,
        address,
      }
    }
  }

  return (
    <DashboardPageHeader
      title='Business Profile'
      description='Manage your organization details, logo, and contact information.'>
      <ProfileForm organization={organization} />
    </DashboardPageHeader>
  )
}
