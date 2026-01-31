import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUserIdFromCookies } from '@/lib/auth-server'
import { nanoid } from 'nanoid'

export const runtime = 'nodejs'

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserIdFromCookies()
    if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    const body = bodySchema.parse(await request.json())

    const org = await prisma.organizations.create({
      data: {
        id: nanoid(),
        name: body.name,
        email: body.email ? body.email.toLowerCase() : null,
        phone: body.phone ?? null,
        isEmailVerified: false,
      },
      select: { id: true },
    })

    await prisma.organizationMembers.create({
      data: {
        organizationId: org.id,
        userId,
        role: 'admin',
      },
    })

    await prisma.users.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    })

    const res = NextResponse.json({ ok: true, organizationId: org.id })
    res.cookies.set('current_organization_id', org.id, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create organization'
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
}

