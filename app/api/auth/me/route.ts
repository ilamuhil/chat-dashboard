import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-token'

export const runtime = 'nodejs'

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length)
  const cookie = request.cookies.get('auth_token')?.value
  return cookie
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request)
    if (!token) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const payload = verifyAuthToken(token)
    const user = await prisma.users.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, phone: true, fullName: true },
    })
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    return NextResponse.json({ ok: true, user })
  } catch {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }
}

