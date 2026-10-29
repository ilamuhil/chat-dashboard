import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserIdFromCookies } from '@/lib/auth/auth-server'
export async function GET(request: NextRequest) {
  const plan = request.nextUrl.searchParams.get('plan')
  if (!['trial', 'starter', 'growth'].includes(plan || ''))
    return NextResponse.redirect(new URL('/pricing', request.url))
  const userId = await getAuthUserIdFromCookies()
  const response = NextResponse.redirect(
    new URL(
      userId ? `/dashboard/subscription?plan=${plan}` : '/auth/signup',
      request.url,
    ),
  )
  response.cookies.set('billing_intent', plan!, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 86400,
  })
  return response
}
