import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getPublicOtpErrorMessage, verifyOtp } from '@/lib/otp'

export const runtime = 'nodejs'

const bodySchema = z.object({
  otpId: z.string().uuid(),
  code: z.string().regex(/^\d{4}$/),
  purpose: z.enum(['signup_email', 'login']).optional(),
  email: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)

    const res = await verifyOtp({
      otpId: body.otpId,
      code: body.code,
      purpose: body.purpose,
      email: body.email,
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: getPublicOtpErrorMessage(res.error) },
        { status: 400 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[auth/otp/verify] OTP verification failed:', err)

    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid verification code.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not verify your code right now. Please try again shortly.',
      },
      { status: 500 },
    )
  }
}

