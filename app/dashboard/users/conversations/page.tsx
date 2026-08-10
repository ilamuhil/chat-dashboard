import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/auth-server'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { MessageSquareIcon } from 'lucide-react'

export default async function ConversationsPage() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })
  if (!organizationId) {
    return (
      <div className='alert-danger w-full max-w-lg'>
        Organization not found. Please contact support.
      </div>
    )
  }

  const conversation = await prisma.conversationsMeta.findFirst({
    where: { organizationId },
    select: { id: true },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
  })

  if (!conversation) {
    return (
      <div className='flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-linear-to-b from-slate-50/80 to-white px-4 py-16 text-center'>
        <div className='mb-4 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-slate-100 text-sky-700 shadow-sm ring-1 ring-sky-200/60'>
          <MessageSquareIcon className='size-5' />
        </div>
        <h2 className='text-sm font-semibold text-foreground'>
          No conversations yet
        </h2>
        <p className='mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground'>
          Come back here when visitors start chatting with your bot. Recent
          threads will appear in the list.
        </p>
      </div>
    )
  }

  return redirect(`/dashboard/users/conversations/${conversation.id}`)
}
