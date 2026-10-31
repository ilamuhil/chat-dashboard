export function requestConfirmationError({
  consent,
  email,
  phone,
  type,
  owner,
  schedule,
  now = new Date(),
}: {
  consent: boolean | null
  email: string | null
  phone: string | null
  type: string | null
  owner: string | null
  schedule: Date | null
  now?: Date
}) {
  if (consent !== true)
    return 'Contact consent is required before confirming this request.'
  if (type === 'callback' && !phone?.trim())
    return 'A phone number is required for a callback.'
  if (type === 'send_course_details' && !email?.trim())
    return 'An email address is required to send course details.'
  if (!email?.trim() && !phone?.trim())
    return 'Contact details are required before confirming this request.'
  if (!owner) return 'Choose a counsellor before confirming this request.'
  if (!schedule || !Number.isFinite(schedule.getTime()) || schedule <= now)
    return 'Choose a future schedule before confirming this request.'
  return null
}
