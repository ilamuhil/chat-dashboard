import { createHash } from 'node:crypto'
import { z } from 'zod'

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  institution: z.string().trim().min(2).max(160),
  websiteUrl: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .url()
        .max(500)
        .refine((value) => /^https?:\/\//i.test(value)),
    ])
    .optional(),
  interest: z.enum(['product', 'setup', 'pricing', 'support', 'other']),
  message: z.string().trim().min(20).max(4000),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
})

type Delivery = {
  to: string
  subject: string
  htmlBody: string
  textBody: string
  replyTo: string
}
const topics = {
  product: 'Product fit & walkthrough',
  setup: 'Setup & website installation',
  pricing: 'Plans & pricing',
  support: 'Existing account support',
  other: 'General enquiry',
}
const MAX_BODY_BYTES = 16_384
const WINDOW_MS = 10 * 60 * 1000

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  )
}

export function createContactHandler({
  deliver,
  recipient,
  now = Date.now,
}: {
  deliver: (message: Delivery) => Promise<unknown>
  recipient: () => string
  now?: () => number
}) {
  // Best-effort per-instance abuse protection; production edge limits can supplement it.
  const attempts = new Map<string, { count: number; expires: number }>()
  const reply = (
    data: object,
    status: number,
    headers?: Record<string, string>,
  ) =>
    Response.json(data, {
      status,
      headers: { 'Cache-Control': 'no-store', ...headers },
    })

  return async function handleContact(request: Request) {
    // Next.js may normalize request.url to an internal hostname. The browser's
    // Host header retains the actual destination, including its port.
    let sameOrigin = false
    try {
      const origin = new URL(request.headers.get('origin') || '')
      const destination =
        request.headers.get('host') || new URL(request.url).host
      sameOrigin =
        /^https?:$/.test(origin.protocol) && origin.host === destination
    } catch {
      /* Missing and opaque origins are rejected. */
    }
    if (!sameOrigin) {
      return reply(
        { error: 'Please send your enquiry from the contact page.' },
        403,
      )
    }
    if (
      !request.headers
        .get('content-type')
        ?.toLowerCase()
        .startsWith('application/json')
    ) {
      return reply(
        { error: 'Please use the contact form to send your enquiry.' },
        415,
      )
    }
    let data: unknown
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'Please fill in your enquiry.' }, 400)
    try {
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > MAX_BODY_BYTES) {
          await reader.cancel()
          return reply(
            { error: 'Your enquiry is too long. Please shorten the message.' },
            413,
          )
        }
        chunks.push(chunk.value)
      }
      data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      return reply(
        { error: 'We couldn’t read your enquiry. Please try again.' },
        400,
      )
    } finally {
      reader.releaseLock()
    }
    const parsed = enquirySchema.safeParse(data)
    if (!parsed.success || parsed.data.website) {
      return reply(
        {
          error:
            'Check your contact details, choose a topic, enter at least 20 characters, and agree to be contacted.',
        },
        400,
      )
    }
    const enquiry = parsed.data
    const timestamp = now()
    for (const [key, attempt] of attempts)
      if (attempt.expires <= timestamp) attempts.delete(key)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const keys = [`email:${enquiry.email.toLowerCase()}`, `ip:${ip}`].map(
      (value) => createHash('sha256').update(value).digest('hex'),
    )
    if (keys.some((key) => (attempts.get(key)?.count || 0) >= 3)) {
      return reply(
        {
          error:
            'You’ve sent several enquiries. Please wait ten minutes before trying again.',
        },
        429,
        { 'Retry-After': '600' },
      )
    }
    while (attempts.size > 2000) attempts.delete(attempts.keys().next().value!)
    for (const key of keys) {
      const current = attempts.get(key)
      attempts.set(key, {
        count: (current?.count || 0) + 1,
        expires: current?.expires || timestamp + WINDOW_MS,
      })
    }

    const rows = [
      ['Name', enquiry.name],
      ['Email', enquiry.email],
      ['Institute', enquiry.institution],
      ['Website', enquiry.websiteUrl || 'Not provided'],
      ['Topic', topics[enquiry.interest]],
      ['Consent', 'Agreed to be contacted about this enquiry'],
      ['Received (UTC)', new Date(timestamp).toISOString()],
    ]
    try {
      await deliver({
        to: recipient(),
        replyTo: enquiry.email,
        subject: `Website enquiry: ${topics[enquiry.interest]}`,
        textBody: [
          ...rows.map(([label, value]) => `${label}: ${value}`),
          '',
          enquiry.message,
        ].join('\n'),
        htmlBody: `<h2>New website enquiry</h2>${rows.map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join('')}<hr /><p>${escapeHtml(enquiry.message).replace(/\r?\n/g, '<br />')}</p>`,
      })
      return reply({ ok: true }, 200)
    } catch {
      // Do not log visitor details or provider messages that may contain them.
      console.error('Contact enquiry delivery failed')
      return reply(
        {
          error:
            'We couldn’t deliver your enquiry right now. Your message has not been sent. Please try again or email us directly.',
        },
        503,
      )
    }
  }
}
