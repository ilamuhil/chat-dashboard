import type { Message } from './[id]/types'

export const conversationStatusEvent = 'dashboard:conversation-status'

export type ConversationStatusDetail = {
  ids: string[]
  status: 'open' | 'closed'
  closedBy: string | null
}

export const conversationEndedTypes = [
  'end_chat',
  'chat_ended',
  'chat_closed',
  'conversation_end',
  'conversation_ended',
  'conversation_closed',
]

export function isConversationEndedMessage(
  message: Pick<Message, 'content_type' | 'role' | 'content'>,
) {
  if (conversationEndedTypes.includes(message.content_type)) {
    return true
  }

  return (
    message.role === 'system' &&
    /\b(?:chat|conversation)\b.*\b(?:ended|closed)\b|\b(?:ended|closed)\b.*\b(?:chat|conversation)\b|\b(?:ended|closed)\b.*\b(?:user|visitor)\b/i.test(
      message.content,
    )
  )
}

export function conversationEndedLabel(
  message: Pick<Message, 'content' | 'closed_by'>,
  conversationClosedBy?: string | null,
) {
  const actor = (message.closed_by || conversationClosedBy || '')
    .trim()
    .toLowerCase()

  if (actor === 'support_agent' || actor === 'agent' || actor === 'admin') {
    return 'Conversation ended by you'
  }

  if (actor === 'visitor' || actor === 'user') {
    return 'Conversation ended by the visitor'
  }

  if (actor === 'system') {
    return 'Conversation ended'
  }

  const content = message.content.toLowerCase()
  if (content.includes('support_agent') || content.includes('ended by you')) {
    return 'Conversation ended by you'
  }
  if (content.includes('by system')) {
    return 'Conversation ended'
  }

  return 'Conversation ended by the visitor'
}
