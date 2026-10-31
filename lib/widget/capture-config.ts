import { z } from 'zod'
export const starterTemplates = [
  'What courses do you offer?',
  'What are the fees and payment options?',
  'What are the eligibility requirements?',
  'When does the next intake start?',
  'How do I apply?',
  'Can I speak with a counsellor?',
] as const
export const conversationStartersSchema = z
  .object({
    enabled: z.boolean(),
    questions: z
      .array(
        z
          .string()
          .trim()
          .min(1, 'Write a suggested question.')
          .max(120, 'Keep each suggested question to 120 characters.'),
      )
      .max(4, 'Use up to four suggested questions.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.enabled && !value.questions.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Add at least one suggested question.',
        path: ['questions'],
      })
    if (
      new Set(value.questions.map((q) => q.replace(/\s+/g, ' ').toLowerCase()))
        .size !== value.questions.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Suggested questions must be unique.',
        path: ['questions'],
      })
  })
const question = z
  .object({
    id: z.string().regex(/^field_[a-z0-9_-]{1,58}$/),
    label: z.string().trim().min(1).max(160),
    type: z.enum(['text', 'number', 'select', 'boolean']),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (
      q.type === 'select' &&
      (q.options.length < 2 || new Set(q.options).size !== q.options.length)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Choice questions need 2–20 unique options',
        path: ['options'],
      })
  })
export const captureConfigSchema = z
  .object({
    required: z
      .object({ name: z.boolean(), email: z.boolean(), phone: z.boolean() })
      .strict()
      .default({ name: true, email: true, phone: false }),
    questions: z
      .array(question)
      .max(3, 'Use up to three custom form questions.')
      .default([]),
    hostedEnabled: z.boolean().default(false),
    conversationStarters: conversationStartersSchema.default({
      enabled: false,
      questions: [],
    }),
  })
  .strict()
  .superRefine((config, ctx) => {
    if (
      new Set(config.questions.map((q) => q.id)).size !==
      config.questions.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Question identifiers must be unique',
        path: ['questions'],
      })
  })
export type CaptureConfig = z.infer<typeof captureConfigSchema>
export const defaultCaptureConfig: CaptureConfig = {
  required: { name: true, email: true, phone: false },
  questions: [],
  hostedEnabled: false,
  conversationStarters: { enabled: false, questions: [] },
}
export function readCaptureConfig(value: unknown): CaptureConfig {
  // Invalid starter data must not reset an otherwise valid capture policy.
  let candidate = value
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const config = value as Record<string, unknown>
    const starters = conversationStartersSchema.safeParse(
      config.conversationStarters,
    )
    candidate = {
      ...config,
      ...(Array.isArray(config.questions)
        ? { questions: config.questions.slice(0, 3) }
        : {}),
      conversationStarters: starters.success
        ? starters.data
        : defaultCaptureConfig.conversationStarters,
    }
  }
  const parsed = captureConfigSchema.safeParse(candidate)
  return parsed.success ? parsed.data : defaultCaptureConfig
}
export function publicCaptureSettings(bot: {
  captureLeads: boolean
  captureName: boolean | null
  captureEmail: boolean | null
  capturePhone: boolean | null
  leadCaptureConfig: unknown
}) {
  const config = readCaptureConfig(bot.leadCaptureConfig)
  const fields = {
    name: !!bot.captureName,
    email: !!bot.captureEmail,
    phone: !!bot.capturePhone,
  }
  return {
    enabled: bot.captureLeads,
    fields,
    required: {
      name: fields.name && config.required.name,
      email: fields.email && config.required.email,
      phone: fields.phone && config.required.phone,
    },
    questions: config.questions,
  }
}
