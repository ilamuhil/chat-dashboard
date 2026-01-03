import { createClient } from "@/lib/supabase-server"

export default async function ConversationsPage() { 
  const supabase = await createClient()
  
  const { data: conversations, error } = await supabase.from('conversations_meta').select('id').order('last_message_at', { ascending: false })
  if (error) {
    console.error('Error getting conversations:', error)
    return <div className='alert-danger'>Error getting conversations: {error.message}</div>
  }
  if (!conversations) {
    console.error('No conversations found')
    return <div className='alert-warning'>No conversations found</div>
  }

  


}