import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Get user's organization membership
  const { data: organizationMember,error: organizationMemberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()
  console.log('organizationMember', organizationMember)
  if (organizationMemberError) {
    console.error('Error getting organization member:', organizationMemberError)
    return <div className='alert-danger'>Error getting organization member: {organizationMemberError.message}</div>
  }
  // Get organization data if user belongs to one
  let organization = null
  if (organizationMember?.organization_id) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationMember.organization_id)
      .maybeSingle()
    organization = data
  }
  console.log('organization', organization)

  return (
    <main className='max-h-dvh overflow-y-auto no-scrollbar space-y-4'>
      <header className='shrink-0 mb-12'>
        <h1 className='dashboard-title'>Business Profile</h1>
      </header>
      <ProfileForm organization={organization} />
    </main>
  )
}
