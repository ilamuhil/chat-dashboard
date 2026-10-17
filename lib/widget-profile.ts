import { z } from 'zod'

const optionalText = (max: number) => z.string().trim().max(max)
export const widgetSettingsSchema = z.object({
  avatar_url: z.union([
    z.literal(''),
    z
      .url()
      .max(2048)
      .refine(
        (v) => new URL(v).protocol === 'https:',
        'Use an HTTPS image link',
      ),
  ]),
  support_email: z
    .union([z.literal(''), z.email().max(254)])
    .transform((v) => v.trim()),
  support_team_name: optionalText(60),
  human_reply_minutes: z.union([
    z.literal(''),
    z.coerce.number().int().min(1).max(10080),
  ]),
  support_hours: optionalText(120),
  help_center_url: z.union([
    z.literal(''),
    z
      .url()
      .max(2048)
      .refine((v) => new URL(v).protocol === 'https:', 'Use an HTTPS link'),
  ]),
})

// Explicit allowlist: never send internal prompts, lead settings or organization data.
export const widgetProfileSelect = {
  avatarUrl: true,
  id: true,
  name: true,
  instituteName: true,
  supportEmail: true,
  supportTeamName: true,
  humanReplyMinutes: true,
  supportHours: true,
  helpCenterUrl: true,
} as const
