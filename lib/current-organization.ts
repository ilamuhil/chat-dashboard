import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export const CURRENT_ORG_COOKIE = 'current_organization_id'

export async function getSelectedOrganizationIdFromCookie(): Promise<
  string | undefined
> {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_ORG_COOKIE)?.value
}

export async function resolveCurrentOrganizationId(opts: {
  supabase: SupabaseClient
  userId: string
}): Promise<string | null> {
  const selected = await getSelectedOrganizationIdFromCookie()

  const { data: memberships, error } = await opts.supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', opts.userId)

  if (error) {
    console.error('Error fetching organization memberships:', error)
    return null
  }

  if (!memberships?.length) return null

  if (selected && memberships.some(m => m.organization_id === selected)) {
    return selected
  }

  return memberships[0].organization_id
}


