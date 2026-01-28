import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendLoginOTPEmail, sendVerifyEmailOtp } from '@/lib/email'

type OtpChannel = 'email'

export type OtpPurposeApi = 'signup_email' | 'login'

function randomOtp(length: number = 6) {
  // numeric-only OTP
  const max = 10 ** length
  const n = Math.floor(Math.random() * max)
  return n.toString().padStart(length, '0')
}

function now() {
  return new Date()
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}


function mapPurpose(purpose: OtpPurposeApi) {
  switch (purpose) {
    case 'signup_email':
      return 'VERIFY_EMAIL' as const
    case 'login':
      return 'LOGIN' as const
  }
}

function mapType() {
  return 'EMAIL' as const
}

export async function createAndSendOtp(params: {
  channel: OtpChannel
  purpose: OtpPurposeApi
  email?: string
  ipAddress?: string
  userAgent?: string
  // optional: if user exists
  userId?: string | null
}) {
  const { channel, purpose, ipAddress, userAgent } = params
  const otp = randomOtp(6)
  const otpHash = await bcrypt.hash(otp, 10)

  const expiresInMinutes = purpose === 'login' ? 10 : 10
  const expiresAt = addMinutes(now(), expiresInMinutes)

  const email = params.email ? normalizeEmail(params.email) : undefined
  if (channel === 'email' && !email) throw new Error('Email is required')

  const record = await prisma.otps.create({
    data: {
      userId: params.userId ?? null,
      code: otpHash,
      type: mapType(),
      purpose: mapPurpose(purpose),
      email: email ?? null,
      phone: null,
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
    select: { id: true, expiresAt: true },
  })

  if (channel === 'email' && email) {
    if (purpose === 'signup_email') {
      await sendVerifyEmailOtp(email, otp, expiresInMinutes)
    } else {
      await sendLoginOTPEmail(email, otp, expiresInMinutes)
    }
  }

  return { otpId: record.id, expiresAt: record.expiresAt }
}

export async function verifyOtp(params: {
  otpId: string
  code: string
  // Optional binding: ensure OTP was for this email/phone
  email?: string
  purpose?: OtpPurposeApi
}) {
  const otp = await prisma.otps.findUnique({
    where: { id: params.otpId },
  })
  if (!otp) return { ok: false as const, error: 'OTP not found' }

  if (otp.isUsed) return { ok: false as const, error: 'OTP already used' }
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false as const, error: 'OTP expired' }
  if (otp.attempts >= otp.maxAttempts) return { ok: false as const, error: 'Too many attempts' }

  if (params.purpose) {
    const expected = mapPurpose(params.purpose)
    if (otp.purpose !== expected) return { ok: false as const, error: 'OTP purpose mismatch' }
  }

  if (params.email) {
    if ((otp.email ?? '').toLowerCase() !== normalizeEmail(params.email)) {
      return { ok: false as const, error: 'OTP email mismatch' }
    }
  }

  const match = await bcrypt.compare(params.code, otp.code)
  if (!match) {
    await prisma.otps.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    })
    return { ok: false as const, error: 'Invalid OTP' }
  }

  await prisma.otps.update({
    where: { id: otp.id },
    data: { isUsed: true, usedAt: new Date() },
  })

  return { ok: true as const, userId: otp.userId ?? null }
}

