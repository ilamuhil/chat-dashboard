import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
export default async function ConversationsPage() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  if (!organizationId) {
    return (
      <div className='alert-danger w-1/2'>
        Organization not found. Please contact support.
      </div>
    )
  }

  const conversation = await prisma.conversationsMeta.findFirst({
    where: { organizationId },
    select: { id: true },
    orderBy: [
      { lastMessageAt: 'desc' },
      { createdAt: 'desc' },
    ],
  })
  if (!conversation) {
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

  return redirect(`/dashboard/users/conversations/${conversation.id}`)
}
