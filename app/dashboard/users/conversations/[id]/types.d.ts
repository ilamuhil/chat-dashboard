export type Message = {
  id: string
  conversation_id: string
  created_at: string
  agent_id: string
  content_type: string
  content: string
  role: 'user' | 'support_agent' | 'ai' | 'system'
}
