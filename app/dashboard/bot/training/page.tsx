import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'

import TrainingDataClient from './TrainingDataClient'


export default async function BotTrainingPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/auth/login')
  }
  const organizationId = await resolveCurrentOrganizationId({
    supabase,
    userId: user.id,
  })
  if (!organizationId) {
    console.error('Organization not found!')
    return <div className='alert-danger'>Organization not found!</div>
  }
  const { data: bots, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('organization_id', organizationId)
  if (botError) {
    console.error('Error getting bots:', botError)
    return <div className='alert-danger'>Error getting bots: {botError.message}</div>
  }
  return (
    <main className='space-y-6'>
      <header>
        <h1 className='dashboard-title'>Training Data</h1>
      </header>
     <TrainingDataClient bots={bots} />
    </main>
  )
}
