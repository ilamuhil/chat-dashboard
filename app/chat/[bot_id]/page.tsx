import { notFound } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { HostedChat } from './HostedChat'
export const dynamic = 'force-dynamic'
export default async function HostedChatPage({
  params,
}: {
  params: Promise<{ bot_id: string }>
}) {
  const { bot_id } = await params
  if (!z.uuid().safeParse(bot_id).success) notFound()
  const bot = await prisma.bots.findFirst({
    where: {
      id: bot_id,
      deletedAt: null,
      leadCaptureConfig: { path: ['hostedEnabled'], equals: true },
    },
    select: { id: true, name: true },
  })
  if (!bot) notFound()
  return (
    <HostedChat
      botId={bot.id}
      name={bot.name}
      scriptUrl={
        process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL || '/chat-widget-ui.iife.js'
      }
    />
  )
}
