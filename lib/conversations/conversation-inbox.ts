export type InboxChat = {
  id: string
  leadId: string | null
  botId: string | null
  createdAt: string
  name: string
  email: string
  phone: string
  lastMessageAt: string | null
  highlightSnippet: string | null
  handOverStatus: string | null
  status: string
  isArchived: boolean
}

export function conversationGroupKey(chat: InboxChat) {
  return chat.leadId ? `lead:${chat.leadId}:${chat.botId ?? ''}` : `chat:${chat.id}`
}

const activity = (chat: InboxChat) => Date.parse(chat.lastMessageAt ?? chat.createdAt)
const attention = (chat: InboxChat) => chat.status === 'open' && !chat.isArchived
  ? chat.handOverStatus === 'requested' ? 2 : 1
  : 0

// Filter before grouping: Closed opens a closed chat; Open opens an open chat.
// Counts/history still include every saved session belonging to that lead.
export function groupInboxChats(matching: InboxChat[], all: InboxChat[]) {
  const members = new Map<string, InboxChat[]>()
  for (const chat of all) {
    const key = conversationGroupKey(chat)
    const group = members.get(key) ?? []
    group.push(chat)
    members.set(key, group)
  }
  const groups = new Map<string, InboxChat[]>()
  for (const chat of matching) {
    const key = conversationGroupKey(chat)
    const group = groups.get(key) ?? []
    group.push(chat)
    groups.set(key, group)
  }
  return Array.from(groups, ([key, matches]) => {
    const ordered = [...matches].sort((a, b) =>
      attention(b) - attention(a) || activity(b) - activity(a) || a.id.localeCompare(b.id))
    return {
      key,
      chat: ordered[0],
      chats: members.get(key) ?? matches,
      latestActivity: Math.max(...matches.map(activity)),
      attention: attention(ordered[0]),
    }
  }).sort((a, b) => b.attention - a.attention || b.latestActivity - a.latestActivity || a.key.localeCompare(b.key))
}
