import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAuthToken } from '@/lib/auth-token'
import { getPublicOtpErrorMessage, verifyOtp } from '@/lib/otp'

export const runtime = 'nodejs'

const bodySchema = z.object({
  email: z.email(),
  otpId: z.uuid(),
  otpCode: z.string().regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)

    const email = body.email.trim().toLowerCase()

    const otpRes = await verifyOtp({
      otpId: body.otpId,
      code: body.otpCode,
      purpose: 'login',
      email,
    })
    if (!otpRes.ok) {
      return NextResponse.json(
        { ok: false, error: getPublicOtpErrorMessage(otpRes.error) },
        { status: 400 },
      )
    }

    const user = await prisma.users.findFirst({
      where: { email },
      select: { id: true, email: true, phone: true, fullName: true, onboardingCompleted: true },
    })
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Invalid login.' }, { status: 400 })
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoggedIn: new Date() },
    })

    const membership = await prisma.organizationMembers.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    })
    const onboardingCompleted = user.onboardingCompleted || !!membership
    if (onboardingCompleted && !user.onboardingCompleted) {
      await prisma.users.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      })
    }

    const token = signAuthToken({ userId: user.id }, '7d')
    const res = NextResponse.json({
      ok: true,
      token,
      user,
      onboardingCompleted,
      organizationId: membership?.organizationId ?? null,
    })
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (err: unknown) {
    console.error('[auth/login] Login failed:', err)

    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Please check your email and verification code.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'We could not sign you in right now. Please try again shortly.',
      },
      { status: 500 },
    )
  }
}

