import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAuthToken } from '@/lib/auth-token'
import { verifyOtp } from '@/lib/otp'

export const runtime = 'nodejs'

const bodySchema = z.object({
  email: z.string().email(),
  otpId: z.string().uuid(),
  otpCode: z.string().min(4).max(12),
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
      return NextResponse.json({ ok: false, error: otpRes.error }, { status: 400 })
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
    const message = err instanceof Error ? err.message : 'Login failed'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}

