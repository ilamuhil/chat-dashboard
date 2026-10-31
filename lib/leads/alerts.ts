import { createHash } from 'node:crypto'
import { OrganizationRole } from '@/lib/organization/roles'
import { prisma } from '@/lib/core/prisma'
import { Prisma } from '@/generated/prisma/client'
import { escapeHtml, renderEmailLayout } from '@/lib/emails/email-layout'
import { dayKey, fromWorkspaceInput } from '@/lib/leads/follow-ups'

// Due today is a planning reminder. Crossing scheduled_for produces one overdue alert.
// Receipts include schedule and recipient: retries/refreshes do not repeat an event,
// while rescheduling or reassigning generates the appropriate new recipient alert.
export async function enqueueFollowUpAlerts(
  now = new Date(),
  db: Pick<typeof prisma, '$executeRaw'> = prisma,
) {
  const endOfDay = new Date(
    Date.parse(fromWorkspaceInput(`${dayKey(now)}T00:00`)!) + 86_400_000,
  )
  const utcNow = now.toISOString()
  return db.$executeRaw(Prisma.sql`
    INSERT INTO public.notifications(id, organization_id, user_id, title, body, type, metadata, channels, event_key)
    SELECT gen_random_uuid(), l.organization_id, m.user_id,
      CASE WHEN f.scheduled_for < ${utcNow}::timestamp THEN 'Follow-up overdue' ELSE 'Follow-up due today' END,
      coalesce(l.name, l.student_name, 'Unnamed lead') || ' · ' || replace(coalesce(f.follow_up_type, 'other'), '_', ' ') || ' · scheduled ' || to_char(f.scheduled_for AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY HH24:MI') || ' IST',
      CASE WHEN f.scheduled_for < ${utcNow}::timestamp THEN 'follow_up_overdue' ELSE 'follow_up_due' END,
      jsonb_build_object('leadId', l.id, 'followUpId', f.id, 'scheduledFor', to_char(f.scheduled_for, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
      '{"dashboard":true,"email":"pending","attempts":0}'::jsonb,
      concat('follow_up:', f.id, ':', f.scheduled_for, ':', CASE WHEN f.scheduled_for < ${utcNow}::timestamp THEN 'overdue' ELSE 'due' END, ':', m.user_id)
    FROM public.lead_follow_ups f
    JOIN public.leads l ON l.id = f.lead_id
    JOIN public.organization_members m ON m.organization_id = l.organization_id AND m.user_id IS NOT NULL
    WHERE f.status = 'pending' AND f.deleted_at IS NULL AND l.deleted_at IS NULL
      AND f.scheduled_for < ${endOfDay.toISOString()}::timestamp
      AND ((m.user_id = coalesce(f.counsellor_id, l.assigned_counsellor_id)) OR
        (m.role IN (${OrganizationRole.Owner}, ${OrganizationRole.Admin}) AND NOT EXISTS (
          SELECT 1 FROM public.organization_members owner
          WHERE owner.organization_id = l.organization_id AND owner.user_id = coalesce(f.counsellor_id, l.assigned_counsellor_id))))
    ON CONFLICT(event_key) DO NOTHING
  `)
}

type PendingAlert = {
  id: string
  organization_id: string
  user_id: string
  title: string
  body: string
  type: string
  metadata: Record<string, string>
  channels: Record<string, Prisma.JsonValue>
  created_at: Date
}
export type AlertEmail = {
  to: string
  subject: string
  html: string
  text: string
  idempotencyKey: string
}
export type AlertSender = (email: AlertEmail) => Promise<string>

export function renderAlertEmail(
  alert: Pick<PendingAlert, 'id' | 'title' | 'body' | 'metadata'>,
  to: string,
): AlertEmail {
  const path = alert.metadata.followUpId
    ? `/dashboard/users/follow-ups?task=${encodeURIComponent(alert.metadata.followUpId)}`
    : `/dashboard/users/leads/${encodeURIComponent(alert.metadata.leadId)}`
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.DASHBOARD_APP_URL ||
    'http://localhost:4000'
  const url = new URL(path, base).toString()
  return {
    to,
    subject: alert.title,
    text: `${alert.body}\n\nOpen in dashboard: ${url}`,
    html: renderEmailLayout({
      previewText: alert.title,
      eyebrow: 'Admissions worklist',
      title: alert.title,
      body: `<p style="font-size:15px;line-height:1.7">${escapeHtml(alert.body)}</p><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0369a1;color:#fff;text-decoration:none">Open in dashboard</a></p>`,
      footerNote:
        'You received this alert because you own the work or administer an unassigned queue.',
    }),
    idempotencyKey: `lead-alert-${createHash('sha256').update(alert.id).digest('hex')}`,
  }
}

async function sendAlertEmail(email: AlertEmail) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': email.idempotencyKey,
    },
    body: JSON.stringify({
      from: `${process.env.RESEND_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Admissions workspace'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  })
  const result = await response.json()
  if (!response.ok || !result.id)
    throw new Error(result.message || 'Email delivery failed')
  return String(result.id)
}

export async function deliverLeadAlertEmails({
  send = sendAlertEmail,
  now = new Date(),
  limit = 25,
  db = prisma,
}: {
  send?: AlertSender
  now?: Date
  limit?: number
  db?: typeof prisma
} = {}) {
  if (send === sendAlertEmail && !process.env.RESEND_API_KEY)
    return { sent: 0, failed: 0, configured: false }
  let sent = 0,
    failed = 0
  const deadline = Date.now() + 35_000
  for (let index = 0; index < limit && Date.now() < deadline; index++) {
    // Claim in a short transaction; network delivery happens outside the lock.
    const alert = await db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<PendingAlert[]>(Prisma.sql`
        SELECT * FROM public.notifications
        WHERE event_key IS NOT NULL AND channels->>'email' IN ('pending', 'sending')
          AND (channels->>'retryAfter' IS NULL OR (channels->>'retryAfter')::timestamp <= ${now.toISOString()}::timestamp)
          AND (channels->>'claimUntil' IS NULL OR (channels->>'claimUntil')::timestamp <= ${now.toISOString()}::timestamp)
        ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
      `)
      const row = rows[0]
      if (!row) return null
      const channels: Record<string, Prisma.JsonValue> = {
        ...row.channels,
        email: 'sending',
        firstAttemptAt: row.channels.firstAttemptAt || now.toISOString(),
        claimUntil: new Date(now.getTime() + 120_000).toISOString(),
      }
      await tx.notifications.update({
        where: { id: row.id },
        data: { channels },
      })
      return { ...row, channels }
    })
    if (!alert) break
    try {
      // https://resend.com/docs/dashboard/emails/idempotency-keys
      if (
        now.getTime() - Date.parse(String(alert.channels.firstAttemptAt)) >
        23 * 60 * 60_000
      ) {
        await db.notifications.update({
          where: { id: alert.id },
          data: {
            channels: { ...alert.channels, email: 'failed', claimUntil: null },
          },
        })
        failed++
        continue
      }
      const member = await db.organizationMembers.findFirst({
        where: { organizationId: alert.organization_id, userId: alert.user_id },
        select: { user: { select: { email: true } }, role: true },
      })
      // Recheck task and owner before email so completed, removed, or reassigned work
      // cannot leak to a departed counsellor or send stale reminders after a retry.
      let active = !!member
      if (active && alert.metadata.followUpId) {
        const task = await db.leadFollowUps.findFirst({
          where: {
            id: alert.metadata.followUpId,
            deletedAt: null,
            status: 'pending',
            lead: { organizationId: alert.organization_id, deletedAt: null },
          },
          include: { lead: { select: { assignedCounsellorId: true } } },
        })
        const ownerId = task?.counsellorId || task?.lead.assignedCounsellorId
        const currentOwner = ownerId
          ? await db.organizationMembers.findFirst({
              where: { organizationId: alert.organization_id, userId: ownerId },
              select: { id: true },
            })
          : null
        active =
          !!task &&
          task.scheduledFor?.toISOString() === alert.metadata.scheduledFor &&
          (currentOwner
            ? ownerId === alert.user_id
            : [OrganizationRole.Owner, OrganizationRole.Admin].some(
                (role) => role === member?.role,
              ))
        if (
          active &&
          alert.type === 'follow_up_due' &&
          task?.scheduledFor &&
          task.scheduledFor < now
        )
          active = false
      } else if (active && alert.metadata.leadId) {
        const lead = await db.leads.findFirst({
          where: {
            id: alert.metadata.leadId,
            organizationId: alert.organization_id,
            deletedAt: null,
          },
          select: {
            assignedCounsellorId: true,
            leadPriority: true,
            pipelineStage: true,
          },
        })
        const owner = lead?.assignedCounsellorId
          ? await db.organizationMembers.findFirst({
              where: {
                organizationId: alert.organization_id,
                userId: lead.assignedCounsellorId,
              },
              select: { id: true },
            })
          : null
        active =
          !!lead &&
          (owner
            ? lead.assignedCounsellorId === alert.user_id
            : [OrganizationRole.Owner, OrganizationRole.Admin].some(
                (role) => role === member?.role,
              )) &&
          (alert.type === 'lead_hot'
            ? lead.leadPriority === 'hot'
            : lead.pipelineStage === 'qualified')
      }
      if (!active || !member?.user?.email) {
        await db.notifications.update({
          where: { id: alert.id },
          data: {
            channels: { ...alert.channels, email: 'skipped', claimUntil: null },
          },
        })
        continue
      }
      const messageId = await send(renderAlertEmail(alert, member.user.email))
      await db.notifications.update({
        where: { id: alert.id },
        data: {
          channels: {
            ...alert.channels,
            email: 'sent',
            messageId,
            sentAt: now.toISOString(),
            claimUntil: null,
          },
        },
      })
      sent++
    } catch (error) {
      failed++
      const attempts = Number(alert.channels.attempts || 0) + 1
      // Resend idempotency covers 24h; cap retries below that window after an
      // ambiguous response so a late retry cannot send the same email twice.
      const expired =
        now.getTime() - Date.parse(String(alert.channels.firstAttemptAt)) >
        23 * 60 * 60_000
      await db.notifications.update({
        where: { id: alert.id },
        data: {
          channels: {
            ...alert.channels,
            email: expired || attempts >= 8 ? 'failed' : 'pending',
            attempts,
            claimUntil: null,
            retryAfter: new Date(
              now.getTime() + Math.min(60, 2 ** attempts) * 60_000,
            ).toISOString(),
          },
        },
      })
      console.error('Lead alert email delivery failed', {
        notificationId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  return { sent, failed, configured: true }
}

export async function maintainLeadWorkflow() {
  // Time can change which existing task is the most useful next step.
  await prisma.$executeRaw`UPDATE public.leads SET recommended_next_action=public.calculate_lead_next_action(leads) WHERE deleted_at IS NULL AND recommended_next_action IS DISTINCT FROM public.calculate_lead_next_action(leads)`
  const queued = await enqueueFollowUpAlerts()
  const email = await deliverLeadAlertEmails()
  return { queued, email }
}
