import { createContactHandler } from '@/lib/organization/contact-enquiry'
import { sendCustomEmail } from '@/lib/email/email'
import { contactEmail } from '@/lib/marketing/marketing'

export const runtime = 'nodejs'

export const POST = createContactHandler({ deliver: sendCustomEmail, recipient: contactEmail })
