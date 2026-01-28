import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAndSendOtp } from '@/lib/otp'

export const runtime = 'nodejs'

const bodySchema = z.object({
  channel: z.enum(['email']),
  purpose: z.enum(['signup_email', 'login']),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined
    const userAgent = request.headers.get('user-agent') ?? undefined

    let userId: string | null | undefined = null
    if (body.purpose === 'login') {
      if (body.email) {
        const u = await prisma.users.findFirst({
          where: { email: body.email.toLowerCase() },
          select: { id: true },
        })
        userId = u?.id ?? null
      }
    }

    // Avoid account enumeration: for login/reset, return OK even if user doesn't exist.
    if (body.purpose === 'login' && !userId) {
      return NextResponse.json({ ok: true })
    }

    const { otpId, expiresAt } = await createAndSendOtp({
      channel: body.channel,
      purpose: body.purpose,
      email: body.email,
      userId,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ ok: true, otpId, expiresAt })
  } catch (err: any) {
    const message = err?.message ?? 'Failed to send OTP'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

