export const SUPPORT_DAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const

export const SUPPORT_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  { value: 'Europe/London', label: 'UK time (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET/CEST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
] as const

export type SupportHoursValue = {
  version: 1
  days: string[]
  start: string
  end: string
  timezone: string
}

export function isSupportHoursValue(value: unknown): value is SupportHoursValue {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SupportHoursValue>
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.days) &&
    typeof candidate.start === 'string' &&
    typeof candidate.end === 'string' &&
    typeof candidate.timezone === 'string'
  )
}

export function parseSupportHours(value: string | null | undefined) {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return isSupportHoursValue(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function serializeSupportHours(value: SupportHoursValue) {
  return JSON.stringify(value)
}
