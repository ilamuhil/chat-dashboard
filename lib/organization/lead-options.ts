export const ENQUIRER_TYPES = [
  'parent',
  'guardian',
  'student',
  'friend',
  'relative',
  'other',
] as const

export const PREFERRED_MODES = ['online', 'offline', 'hybrid', 'both'] as const

export const JOINING_TIMELINES = [
  'as_soon_as_possible',
  'next_available_intake',
  'next_academic_year',
  'specific_period',
  'exploring',
  'immediate',
  'within_1_week',
  'within_1_month',
  'within_3_months',
  'beyond_3_months',
] as const

export const PRIMARY_INTENTS = [
  'course_info',
  'course_recommendation',
  'eligibility',
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
  'review_eligibility',
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
  'review_eligibility',
  'review_elligibility',
  'other',
] as const

export const FOLLOW_UP_STATUSES = [
  'requested',
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
