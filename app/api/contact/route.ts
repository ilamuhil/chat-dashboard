import { createContactHandler } from '@/lib/contact-enquiry'
import { sendCustomEmail } from '@/lib/email'
import { contactEmail } from '@/lib/marketing'

export const runtime = 'nodejs'

export const POST = createContactHandler({ deliver: sendCustomEmail, recipient: contactEmail })
