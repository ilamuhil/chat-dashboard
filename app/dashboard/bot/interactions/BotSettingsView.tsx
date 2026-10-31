import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/core/prisma'
import { requireOrganizationPermission } from '@/lib/organization/organization-members'
import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { BotCaptureSettings } from '@/components/bot-capture-settings'
import {
  dashboardButtonClass,
  dashboardOutlineButtonClass,
} from '@/lib/dashboard/dashboard-buttons'
import { cn } from '@/lib/core/utils'
import ConfigureBotForm from './ConfigureBotForm'
import type { Bot } from './action'

export default async function BotSettingsView({
  botId,
  step,
}: {
  botId: string
  step: 'bot' | 'widget'
}) {
  const { organizationId } = await requireOrganizationPermission('configure')
  if (!z.uuid().safeParse(botId).success) notFound()
  const b = await prisma.bots.findFirst({
    where: { id: botId, organizationId, deletedAt: null },
  })
  if (!b) notFound()
  const bot: Bot = {
    id: b.id,
    organization_id: organizationId,
    avatar_url: b.avatarUrl,
    support_email: b.supportEmail,
    support_team_name: b.supportTeamName,
    human_reply_minutes: b.humanReplyMinutes,
    support_hours: b.supportHours,
    help_center_url: b.helpCenterUrl,
    widget_visibility_mode: b.widgetVisibilityMode,
    widget_visibility_routes: b.widgetVisibilityRoutes,
    name: b.name,
    institute_name: b.instituteName,
    tone: b.tone,
    role: b.role,
    business_description: b.businessDescription,
    first_message: b.firstMessage,
    confirmation_message: b.confirmationMessage,
    lead_capture_message: b.leadCaptureMessage,
    capture_leads: b.captureLeads,
    lead_capture_timing: b.leadCaptureTiming as Bot['lead_capture_timing'],
    capture_name: Boolean(b.captureName),
    capture_email: Boolean(b.captureEmail),
    capture_phone: Boolean(b.capturePhone),
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  }
  return (
    <DashboardPageHeader
      title={bot.name}
      description={
        step === 'bot'
          ? 'Step 1 of 2 · Configure your bot, then continue to questions and hosted chat.'
          : 'Step 2 of 2 · Configure questions, conversation starters and your hosted chat page.'
      }
    >
      <div className='space-y-5'>
        <Link
          href='/dashboard/bot/interactions'
          className='inline-flex text-sm font-medium text-muted-foreground hover:text-foreground'
        >
          ← All bots
        </Link>
        <nav
          aria-label='Bot setup steps'
          className='grid grid-cols-1 gap-3 sm:grid-cols-2'
        >
          {(
            [
              {
                id: 'bot',
                label: '1. Bot configuration',
                detail: 'Identity, messages and lead capture',
                href: `/dashboard/bot/interactions/${bot.id}`,
              },
              {
                id: 'widget',
                label: '2. Widget settings',
                detail: 'Questions, suggestions and hosted chat',
                href: `/dashboard/bot/interactions/${bot.id}/widget`,
              },
            ] as const
          ).map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={step === tab.id ? 'page' : undefined}
              className={cn(
                'rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                step === tab.id
                  ? dashboardButtonClass
                  : dashboardOutlineButtonClass,
              )}
            >
              <span className='block text-sm font-semibold'>{tab.label}</span>
              <span className='mt-1 block text-xs opacity-80'>
                {tab.detail}
              </span>
            </Link>
          ))}
        </nav>
        {step === 'bot' ? (
          <ConfigureBotForm bot={bot} />
        ) : (
          <BotCaptureSettings botId={bot.id} />
        )}
      </div>
    </DashboardPageHeader>
  )
}
