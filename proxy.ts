import { NextResponse, type NextRequest } from 'next/server'
import { verifyAuthToken } from '@/lib/auth/auth-token'
import { prisma } from '@/lib/core/prisma'
import { can } from '@/lib/organization/permissions'
import { requestPermission } from '@/lib/organization/access-policy'
export async function proxy(request: NextRequest) {
  const permission = requestPermission(request.nextUrl.pathname, request.method)
  if (!permission) return NextResponse.next()
  const isApi = request.nextUrl.pathname.startsWith('/api/')
  const deny = (status: number) =>
    isApi
      ? NextResponse.json(
          {
            error:
              status === 401
                ? 'Please sign in'
                : 'You do not have permission for this action',
          },
          { status },
        )
      : NextResponse.redirect(
          new URL(
            status === 401 ? '/auth/login' : '/dashboard/overview',
            request.url,
          ),
        )
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : request.cookies.get('auth_token')?.value
  let userId: string
  try {
    if (!token) return deny(401)
    userId = verifyAuthToken(token).sub
  } catch {
    return deny(401)
  }
  const selected = request.cookies.get('current_organization_id')?.value
  const memberships = await prisma.organizationMembers.findMany({
    where: { userId, user: { isActive: true, isBanned: false } },
    select: { organizationId: true, role: true },
  })
  const member =
    memberships.find((m) => m.organizationId === selected) || memberships[0]
  if (!member)
    return isApi
      ? deny(403)
      : NextResponse.redirect(new URL('/onboarding', request.url))
  if (!can(member.role, 'read'))
    return new NextResponse(
      'Your membership role is unavailable. Contact an institute Owner.',
      { status: 403 },
    )
  if (!can(member.role, permission)) return deny(403)
  return NextResponse.next()
}
export const config = { matcher: ['/dashboard/:path*', '/api/:path*'] }
