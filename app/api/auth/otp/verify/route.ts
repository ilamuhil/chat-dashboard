import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtp } from '@/lib/otp'

export const runtime = 'nodejs'

const bodySchema = z.object({
  otpId: z.string().uuid(),
  code: z.string().min(4).max(12),
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
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    const message = err?.message ?? 'Failed to verify OTP'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

