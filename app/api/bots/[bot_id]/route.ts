import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-token'

export const runtime = 'nodejs'

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length)
  return request.cookies.get('auth_token')?.value
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bot_id: string }> }
) {
  const { bot_id } = await params
  if (!bot_id) return NextResponse.json({ ok: false, error: 'Bot id required' }, { status: 400 })

  const token = getToken(request)
  if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  let userId: string
  try {
    userId = verifyAuthToken(token).sub
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const bot = await prisma.bots.findUnique({
    where: { id: bot_id },
    select: { id: true, organizationId: true },
  })
  if (!bot?.organizationId) {
    return NextResponse.json({ ok: false, error: 'Bot not found' }, { status: 404 })
  }

  const membership = await prisma.organizationMembers.findFirst({
    where: { userId, organizationId: bot.organizationId },
    select: { role: true },
  })
  if (!membership) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.bots.delete({ where: { id: bot_id } })
  return NextResponse.json({ ok: true })
}

