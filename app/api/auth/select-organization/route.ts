import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuthUserId } from '@/lib/auth-server'

const bodySchema = z.object({
  organizationId: z.string().min(1),
  next: z.string().startsWith('/').default('/dashboard'),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = bodySchema.parse(await request.json())
    const { prisma } = await import('@/lib/prisma')

    const membership = await prisma.organizationMembers.findFirst({
      where: { userId, organizationId: body.organizationId },
      select: { organizationId: true },
    })

    if (!membership?.organizationId) {
      return NextResponse.json(
        { error: 'You are not a member of that organization.' },
        { status: 403 },
      )
    }

    const response = NextResponse.json({ ok: true, next: body.next })
    response.cookies.set(
      'current_organization_id',
      membership.organizationId,
      {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      },
    )
    return response
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not select organization'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
