import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })

  // Get organization data if user belongs to one
  let organization = null
  if (organizationId) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle()
    organization = data
  }

  return (
    <main className='max-h-dvh overflow-y-auto no-scrollbar space-y-4'>
      <header className='shrink-0 mb-12'>
        <h1 className='dashboard-title'>Business Profile</h1>
      </header>
      <ProfileForm organization={organization} />
    </main>
  )
}
