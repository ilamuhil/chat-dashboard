export type LeadChatHistory = {
  lead: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    aiSummary: string | null
    courseInterest: string | null
    preferredMode: string | null
    consentToContact: boolean | null
  }
  conversations: Array<{
    id: string
    createdAt: string
    lastMessageAt: string | null
    lastMessageSnippet: string | null
    status: string
    isArchived: boolean
    aiSummary: string | null
    summaryStatus: string
  }>
}
