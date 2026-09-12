import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAndSendOtp } from '@/lib/otp'
import { validateEmail } from '@/lib/emails/validate-email'

export const runtime = 'nodejs'

const bodySchema = z.object({
  channel: z.enum(['email']),
  purpose: z.enum(['signup_email', 'login']),
  email: z.email(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)

    if (body.purpose === 'signup_email') {
      const emailValidation = validateEmail(body.email)

      if (!emailValidation.isValid) {
        return NextResponse.json(
          { ok: false, error: emailValidation.errorMessage },
          { status: 400 },
        )
      }
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined
    const userAgent = request.headers.get('user-agent') ?? undefined

    let userId: string | null | undefined = null
    if (body.purpose === 'login') {
      const u = await prisma.users.findFirst({
        where: { email: body.email.toLowerCase() },
        select: { id: true },
      })
      userId = u?.id ?? null
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
  } catch (err: unknown) {
    console.error('[auth/otp/request] Failed to create or send OTP:', err)

    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Please enter a valid email address and try again.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not send your verification code right now. Please try again shortly.',
      },
      { status: 500 },
    )
  }
}

