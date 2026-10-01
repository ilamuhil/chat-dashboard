import { NextResponse } from 'next/server'
import { z } from 'zod'

export const ENQUIRER_TYPES = [
  'parent',
  'guardian',
  'student',
  'friend',
  'relative',
  'other',
] as const

export const PREFERRED_MODES = ['online', 'offline', 'both'] as const

export const JOINING_TIMELINES = [
  'immediate',
  'within_1_week',
  'within_1_month',
  'within_3_months',
  'beyond_3_months',
] as const

export const PRIMARY_INTENTS = [
  'course_info',
  'course_recommendation',
  'elligibility',
  'fees',
  'batch_or_schedule',
  'application',
  'counselling',
  'demo',
  'campus_visit',
  'general_enquiry',
  'other',
] as const

export const LEAD_PRIORITIES = ['hot', 'warm', 'cold'] as const

export const RECOMMENDED_NEXT_ACTIONS = [
  'schedule_callback',
  'schedule_demo',
  'schedule_campus_visit',
  'application_follow_up',
  'send_course_details',
  'review_elligibility',
  'other',
] as const

export const PIPELINE_STAGES = [
  'new_enquiry',
  'qualified',
  'counselling_requested',
  'contacted',
  'application_started',
  'enrolled',
  'lost',
] as const

export const FOLLOW_UP_TYPES = [
  'callback',
  'demo',
  'campus_visit',
  'application_follow_up',
  'send_course_details',
  'review_elligibility',
  'other',
] as const

export const FOLLOW_UP_STATUSES = [
  'pending',
  'complete',
  'cancelled',
] as const

export const FOLLOW_UP_OUTCOMES = [
  'contacted',
  'not_interested',
  'interested',
  'no_answer',
  'follow_up_again',
  'application_started',
  'enrolled',
  'lost',
] as const

const nullableText = (max: number) =>
  z.preprocess(
    value =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.string().trim().max(max).nullable(),
  )

const optionalText = (max: number) => nullableText(max).optional()

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    value =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.enum(values).nullable().optional(),
  )

const optionalEmail = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.email('Enter a valid email address').trim().toLowerCase().nullable().optional(),
)

const leadFields = {
  email: optionalEmail,
  phone: optionalText(50),
  enquirerType: optionalEnum(ENQUIRER_TYPES),
  studentName: optionalText(200),
  studentAge: optionalText(50),
  studentGender: optionalText(50),
  courseInterest: optionalText(300),
  educationLevel: optionalText(200),
  preferredMode: optionalEnum(PREFERRED_MODES),
  joiningTimeline: optionalEnum(JOINING_TIMELINES),
  primaryIntent: optionalEnum(PRIMARY_INTENTS),
  leadPriority: optionalEnum(LEAD_PRIORITIES),
  priorityReason: optionalText(2_000),
  aiSummary: optionalText(10_000),
  recommendedNextAction: optionalEnum(RECOMMENDED_NEXT_ACTIONS),
  pipelineStage: optionalEnum(PIPELINE_STAGES),
  consentToContact: z.boolean().optional(),
}

export const manualLeadCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    ...leadFields,
    pipelineStage: z.enum(PIPELINE_STAGES).default('new_enquiry'),
  })
  .strict()
  .refine(data => Boolean(data.email || data.phone), {
    message: 'At least an email or phone number is required',
    path: ['email'],
  })

export const leadUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name cannot be blank').max(200).optional(),
    ...leadFields,
  })
  .strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export const bulkLeadDeleteSchema = z
  .object({
    leadIds: z
      .array(z.uuid('Each lead ID must be a valid UUID'))
      .min(1, 'Select at least one lead')
      .max(500, 'No more than 500 leads can be deleted at once')
      .transform(ids => [...new Set(ids)]),
  })
  .strict()

const optionalDateTime = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.iso.datetime({ offset: true }).nullable().optional(),
)

const followUpFields = {
  counsellorId: z.preprocess(
    value =>
      typeof value === 'string' && value.trim() === '' ? null : value,
    z.uuid('Counsellor ID must be a valid UUID').nullable().optional(),
  ),
  scheduledFor: optionalDateTime,
  outcome: optionalEnum(FOLLOW_UP_OUTCOMES),
  notes: optionalText(10_000),
}

export const followUpCreateSchema = z
  .object({
    followUpType: z.enum(FOLLOW_UP_TYPES),
    status: z.enum(FOLLOW_UP_STATUSES).default('pending'),
    ...followUpFields,
  })
  .strict()

export const followUpUpdateSchema = z
  .object({
    followUpType: optionalEnum(FOLLOW_UP_TYPES),
    status: optionalEnum(FOLLOW_UP_STATUSES),
    ...followUpFields,
  })
  .strict()
  .refine(data => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  })

export function leadApiError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message || 'Invalid request',
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    )
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = error instanceof Error ? error.message : ''
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? String(error.digest)
      : ''

  if (digest.startsWith('NEXT_REDIRECT')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (
    message.includes('Only organization admins') ||
    message.includes('not a member') ||
    message.includes('No organization selected')
  ) {
    return NextResponse.json({ error: message }, { status: 403 })
  }

  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}
