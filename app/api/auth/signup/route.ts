import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAuthToken } from '@/lib/auth-token'
import { getPublicOtpErrorMessage, verifyOtp } from '@/lib/otp'
import { validateEmail } from '@/lib/emails/validate-email'

export const runtime = 'nodejs'

const bodySchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.email(),
  acceptTnc: z.boolean(),
  emailOtpId: z.uuid(),
  emailOtpCode: z.string().regex(/^\d{4}$/),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)

    if (!body.acceptTnc) {
      return NextResponse.json(
        {
          ok: false,
          error: 'You must accept the Terms & Conditions to sign up.',
        },
        { status: 400 },
      )
    }

    const email = body.email.toLowerCase()
    const emailValidation = validateEmail(email)

    if (!emailValidation.isValid) {
      return NextResponse.json(
        { ok: false, error: emailValidation.errorMessage },
        { status: 400 },
      )
    }

    const emailCheck = await verifyOtp({
      otpId: body.emailOtpId,
      code: body.emailOtpCode,
      purpose: 'signup_email',
      email,
    })
    if (!emailCheck.ok) {
      return NextResponse.json(
        { ok: false, error: getPublicOtpErrorMessage(emailCheck.error) },
        { status: 400 },
      )
    }

    const existing = await prisma.users.findFirst({
      where: {
        email,
      },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: 'An account already exists with this email or phone number.',
        },
        { status: 409 },
      )
    }

    const user = await prisma.users.create({
      data: {
        email,
        fullName: body.fullName ?? null,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoggedIn: new Date(),
        onboardingCompleted: false,
      },
      select: { id: true, email: true, phone: true, fullName: true },
    })

    const token = signAuthToken({ userId: user.id }, '7d')
    const res = NextResponse.json({
      ok: true,
      token,
      user,
      onboardingCompleted: false,
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
    console.error('[auth/signup] Signup failed:', err)

    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Please check your details and verification code.',
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          'We could not create your account right now. Please try again shortly.',
      },
      { status: 500 },
    )
  }
}
