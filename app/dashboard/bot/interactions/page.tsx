import { createClient } from "@/lib/supabase-server"
import ConfigureBotForm from "./ConfigureBotForm"
import { redirect } from "next/navigation"
import { resolveCurrentOrganizationId } from "@/lib/current-organization"

export default async function BotInteractionsPage() {
  
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
    redirect('/auth/login')
  }
  const { data: bots, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('organization_id', organizationId)
  if (botError){
    console.error('Error getting bots:', botError)
    return <div className='alert-danger'>Error getting bots: {botError.message}</div>
  }
  
  return (
    <main className='max-h-dvh overflow-y-auto no-scrollbar space-y-4'>
      <header>
        <h1 className='dashboard-title'>Interactions</h1>
      </header>
      <ConfigureBotForm bot={bots?.length ? bots[0] : null}/>
    </main>
  )
}
