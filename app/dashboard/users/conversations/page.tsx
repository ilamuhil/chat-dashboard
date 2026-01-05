import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
export default async function ConversationsPage() {
  const supabase = await createClient()

  const { data: conversations, error } = await supabase
    .from('conversations_meta')
    .select('id')
    .order('last_message_at', { ascending: false })
  if (error) {
    console.error('Error getting conversations:', error)
    return (
      <div className='alert-danger w-1/2'>
        Error getting conversations. Please contact support.
      </div>
    )
  }
  if (!conversations || conversations.length === 0) {
    console.error('No conversations found')
    return (
      <div className='flex flex-col items-center justify-center h-full bg-white rounded'>
        <h1 className='dashboard-title'>No conversations found</h1>
        <small className='text-muted-foreground'>
          No conversations found. Comeback here when users chat with your bot.
        </small>
      </div>
    )
  }

  return redirect(`/dashboard/users/conversations/${conversations[0].id}`)
}
