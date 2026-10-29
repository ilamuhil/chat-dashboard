'use server'

import { z } from 'zod'
import { widgetSettingsSchema } from '@/lib/widget-profile'
import { resolveCurrentOrganizationId } from '@/lib/current-organization'
import { requireAuthUserId } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { withBillingLock, assertCapacity } from '@/lib/billing/service'
import { getSecretKey } from '@/lib/jwt'
import { pythonApiRequest } from '@/lib/axios-server-config'
import { signToken } from '@/lib/jwt'

export type Bot = {
  id: string
  organization_id: string
  avatar_url: string | null
  support_email: string | null
  support_team_name: string | null
  human_reply_minutes: number | null
  support_hours: string | null
  help_center_url: string | null
  widget_visibility_mode: string
  widget_visibility_routes: string[]
  name: string
  tone: string | null
  role: string | null
  business_description: string | null
  institute_name: string | null
  first_message: string | null
  confirmation_message: string | null
  lead_capture_message: string | null
  capture_leads: boolean
  lead_capture_timing: 'start' | 'after_first' | null
  capture_name: boolean
  capture_email: boolean
  capture_phone: boolean
  created_at: string
  updated_at: string
}

export type BotResult = {
  error?: string | Record<string, string[]>
  success?: string
  bot?: Bot | null
  nonce?: string | null
  formValues?: BotFormValues
}

export type BotFormValues = {
  avatar_url: string
  support_email: string
  support_team_name: string
  human_reply_minutes: string
  support_hours: string
  help_center_url: string
  widget_visibility_mode: string
  widget_visibility_routes: string
  name: string
  institute_name: string
  tone: string
  role: string
  first_message: string
  lead_capture_message: string
  confirmation_message: string
  business_description: string
  capture_leads: boolean
  lead_capture_timing: string
  capture_name: boolean
  capture_email: boolean
  capture_phone: boolean
}

const botMetSchema = z
  .object({
    name: z.string().min(3, 'Bot name must be at least 3 characters').max(50),
    tone: z.enum([
      'friendly',
      'professional',
      'enthusiastic',
      'casual',
      'concise',
      'empathetic',
      'humorous',
      'authoritative',
      'formal',
      'neutral',
    ]),
    role: z.enum([
      'customer-support',
      'sales',
      'marketing',
      'technical-support',
      'other',
    ]),
    first_message: z.string().min(3).max(500),
    institute_name: z.string().min(3).max(75).optional(),
    lead_capture_message: z.string().optional(),
    confirmation_message: z.string().optional(),
    business_description: z
      .string()
      .min(3)
      .refine(
        (value) => value.trim().split(/\s+/).filter(Boolean).length <= 600,
        'Business description must be 600 words or fewer',
      ),
    capture_leads: z.boolean(),
    lead_capture_timing: z
      .enum(['before-conversation', 'after-first-message'])
      .optional(),
    capture_name: z.boolean().optional(),
    capture_email: z.boolean().optional(),
    capture_phone: z.boolean().optional(),
  })
  .extend(widgetSettingsSchema.shape)
  .superRefine((data, ctx) => {
    if (
      data.widget_visibility_mode !== 'all' &&
      data.widget_visibility_routes.length === 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['widget_visibility_routes'],
        message: 'Add at least one route for this visibility mode.',
      })
    }
  })

export async function updateBotInteractions(
  prevState: BotResult | null,
  formData: FormData,
): Promise<BotResult> {
  const nonce = Date.now().toString()
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    return {
      error: 'You must belong to an organization to create a bot',
      nonce,
    }
  }

  // Convert form data to proper types
  const captureLeadsValue = formData.get('capture_leads')
  const captureLeads =
    captureLeadsValue === 'on' ||
    captureLeadsValue === 'true' ||
    captureLeadsValue?.toString() === 'true'

  const captureNameValue = formData.get('capture_name')
  const captureName =
    captureNameValue === 'on' ||
    captureNameValue === 'true' ||
    captureNameValue?.toString() === 'true'

  const captureEmailValue = formData.get('capture_email')
  const captureEmail =
    captureEmailValue === 'on' ||
    captureEmailValue === 'true' ||
    captureEmailValue?.toString() === 'true'

  const capturePhoneValue = formData.get('capture_phone')
  const capturePhone =
    capturePhoneValue === 'on' ||
    capturePhoneValue === 'true' ||
    capturePhoneValue?.toString() === 'true'

  const formValues: BotFormValues = {
    avatar_url: String(formData.get('avatar_url') ?? '').trim(),
    support_email: String(formData.get('support_email') ?? '').trim(),
    support_team_name: String(formData.get('support_team_name') ?? '').trim(),
    human_reply_minutes: String(
      formData.get('human_reply_minutes') ?? '',
    ).trim(),
    support_hours: String(formData.get('support_hours') ?? '').trim(),
    help_center_url: String(formData.get('help_center_url') ?? '').trim(),
    widget_visibility_mode: String(
      formData.get('widget_visibility_mode') ?? 'all',
    ),
    widget_visibility_routes: String(
      formData.get('widget_visibility_routes') ?? '',
    ),
    name: String(formData.get('name') ?? ''),
    institute_name: String(formData.get('institute_name') ?? ''),
    tone: String(formData.get('tone') ?? ''),
    role: String(formData.get('role') ?? ''),
    first_message: String(formData.get('first_message') ?? ''),
    lead_capture_message: String(formData.get('lead_capture_message') ?? ''),
    confirmation_message: String(formData.get('confirmation_message') ?? ''),
    business_description: String(formData.get('business_description') ?? ''),
    capture_leads: captureLeads,
    lead_capture_timing: String(formData.get('lead_capture_timing') ?? ''),
    capture_name: captureName,
    capture_email: captureEmail,
    capture_phone: capturePhone,
  }

  const validatedFields = botMetSchema.safeParse({
    avatar_url: String(formData.get('avatar_url') ?? '').trim(),
    support_email: String(formData.get('support_email') ?? '').trim(),
    support_team_name: String(formData.get('support_team_name') ?? '').trim(),
    human_reply_minutes: String(
      formData.get('human_reply_minutes') ?? '',
    ).trim(),
    support_hours: String(formData.get('support_hours') ?? '').trim(),
    help_center_url: String(formData.get('help_center_url') ?? '').trim(),
    widget_visibility_mode: String(
      formData.get('widget_visibility_mode') ?? 'all',
    ),
    widget_visibility_routes: String(
      formData.get('widget_visibility_routes') ?? '',
    ),
    name: formData.get('name'),
    institute_name: formData.get('institute_name'),
    tone: formData.get('tone'),
    role: formData.get('role'),
    first_message: formData.get('first_message'),
    lead_capture_message: formData.get('lead_capture_message') || '',
    confirmation_message: formData.get('confirmation_message') || '',
    business_description: formData.get('business_description'),
    capture_leads: captureLeads,
    lead_capture_timing: formData.get('lead_capture_timing'),
    capture_name: captureName,
    capture_email: captureEmail,
    capture_phone: capturePhone,
  })

  if (!validatedFields.success) {
    const fieldErrors: Record<string, string[]> = {}
    validatedFields.error.issues.forEach((issue) => {
      const path = issue.path.join('.')
      if (!fieldErrors[path]) {
        fieldErrors[path] = []
      }
      fieldErrors[path].push(issue.message)
    })
    return { error: fieldErrors, nonce, formValues }
  }

  const data = validatedFields.data

  // Map form values to database column names
  // leadCaptureTiming: 'before-conversation' -> 'start', 'after-first-message' -> 'after_first'
  const leadCaptureTimingDb =
    data.lead_capture_timing === 'before-conversation'
      ? 'start'
      : data.lead_capture_timing === 'after-first-message'
        ? 'after_first'
        : null

  // Get bot_id from formData to determine if this is an update or create
  const botId = formData.get('bot_id')?.toString()

  const dbData = {
    updatedAt: new Date(),
    avatarUrl: data.avatar_url || null,
    supportEmail: data.support_email || null,
    supportTeamName: data.support_team_name || null,
    humanReplyMinutes:
      data.human_reply_minutes === '' ? null : data.human_reply_minutes,
    supportHours: data.support_hours || null,
    helpCenterUrl: data.help_center_url || null,
    widgetVisibilityMode: data.widget_visibility_mode,
    widgetVisibilityRoutes:
      data.widget_visibility_mode === 'all'
        ? []
        : data.widget_visibility_routes,
    organizationId,
    name: data.name,
    instituteName: data.institute_name,
    tone: data.tone,
    role: data.role,
    businessDescription: data.business_description,
    firstMessage: data.first_message,
    confirmationMessage: data.confirmation_message || null,
    leadCaptureMessage: data.lead_capture_message || null,
    captureLeads: data.capture_leads,
    leadCaptureTiming: leadCaptureTimingDb,
    captureName: data.capture_name || false,
    captureEmail: data.capture_email || false,
    capturePhone: data.capture_phone || false,
  }

  const mapBot = (b: {
    avatarUrl: string | null
    supportEmail: string | null
    supportTeamName: string | null
    humanReplyMinutes: number | null
    supportHours: string | null
    helpCenterUrl: string | null
    widgetVisibilityMode: string
    widgetVisibilityRoutes: string[]
    id: string
    organizationId: string | null
    name: string
    instituteName: string | null
    tone: string | null
    role: string | null
    businessDescription: string | null
    firstMessage: string | null
    confirmationMessage: string | null
    leadCaptureMessage: string | null
    captureLeads: boolean
    leadCaptureTiming: string | null
    captureName: boolean | null
    captureEmail: boolean | null
    capturePhone: boolean | null
    createdAt: Date
    updatedAt: Date
  }): Bot => ({
    avatar_url: b.avatarUrl,
    support_email: b.supportEmail,
    support_team_name: b.supportTeamName,
    human_reply_minutes: b.humanReplyMinutes,
    support_hours: b.supportHours,
    help_center_url: b.helpCenterUrl,
    widget_visibility_mode: b.widgetVisibilityMode,
    widget_visibility_routes: b.widgetVisibilityRoutes,
    id: b.id,
    organization_id: b.organizationId ?? organizationId,
    institute_name: b.instituteName,
    name: b.name,
    tone: b.tone,
    role: b.role,
    business_description: b.businessDescription,
    first_message: b.firstMessage,
    confirmation_message: b.confirmationMessage,
    lead_capture_message: b.leadCaptureMessage,
    capture_leads: b.captureLeads,
    lead_capture_timing: (b.leadCaptureTiming ??
      null) as Bot['lead_capture_timing'],
    capture_name: Boolean(b.captureName),
    capture_email: Boolean(b.captureEmail),
    capture_phone: Boolean(b.capturePhone),
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  })

  if (botId) {
    const existingBot = await prisma.bots.findFirst({
      where: { id: botId, organizationId },
      select: { id: true },
    })
    if (!existingBot) {
      return {
        error: "Bot not found or you don't have permission to update it",
        nonce,
        formValues,
      }
    }

    const updatedBot = await prisma.bots.update({
      where: { id: botId },
      data: dbData,
      select: {
        avatarUrl: true,
        supportEmail: true,
        supportTeamName: true,
        humanReplyMinutes: true,
        supportHours: true,
        helpCenterUrl: true,
        widgetVisibilityMode: true,
        widgetVisibilityRoutes: true,
        id: true,
        organizationId: true,
        instituteName: true,
        name: true,
        tone: true,
        role: true,
        businessDescription: true,
        firstMessage: true,
        confirmationMessage: true,
        leadCaptureMessage: true,
        captureLeads: true,
        leadCaptureTiming: true,
        captureName: true,
        captureEmail: true,
        capturePhone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      success: 'Bot configuration updated successfully',
      bot: mapBot(updatedBot),
      nonce,
    }
  } else {
    // Authorize before creating the bot or any associated model configuration.
    const adminMembership = await prisma.organizationMembers.findFirst({
      where: { organizationId, userId, role: 'admin' },
      select: { id: true },
    })
    if (!adminMembership) {
      return {
        error: 'Organization administrator required to create a bot',
        nonce,
        formValues,
      }
    }

    const newBot = await withBillingLock(organizationId, async (tx) => {
      await assertCapacity(tx, organizationId, 'bots')
      return tx.bots.create({
        data: dbData,
        select: {
          avatarUrl: true,
          supportEmail: true,
          supportTeamName: true,
          humanReplyMinutes: true,
          supportHours: true,
          helpCenterUrl: true,
          widgetVisibilityMode: true,
          widgetVisibilityRoutes: true,
          id: true,
          organizationId: true,
          instituteName: true,
          name: true,
          tone: true,
          role: true,
          businessDescription: true,
          firstMessage: true,
          confirmationMessage: true,
          leadCaptureMessage: true,
          captureLeads: true,
          leadCaptureTiming: true,
          captureName: true,
          captureEmail: true,
          capturePhone: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })

    // call python server and create a new records for the model config version.
    const privateKey = getSecretKey()
    if (!privateKey) {
      return {
        error: 'Internal server error',
        nonce,
        formValues,
      }
    }

    const token = signToken(
      {
        organization_id: organizationId,
        bot_id: newBot.id,
        type: 'dashboard_admin',
        user_id: userId,
      },
      privateKey,
      '5m',
    )

    try {
      await pythonApiRequest('POST', '/api/model-config/create', token, {
        bot_id: newBot.id,
        user_id: userId,
      })
    } catch (error: unknown) {
      //roll back the database transaction
      console.error('Error creating model config:', error)
      try {
        await prisma.bots.delete({
          where: { id: newBot.id },
        })
        return {
          error: 'Failed to create bot',
          nonce,
          formValues,
        }
      } catch (e: unknown) {
        console.error('Error rolling back database transaction:', e)
        return {
          error: 'Failed to create bot',
          nonce,
          formValues,
        }
      }
    }

    return {
      success: 'Bot configuration saved successfully',
      bot: mapBot(newBot),
      nonce,
    }
  }
}
