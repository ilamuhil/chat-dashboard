import { NextRequest, NextResponse } from 'next/server'

import { consumeMagicLink } from '@/lib/magic-link'
import { prisma } from '@/lib/prisma'
import { signAuthToken } from '@/lib/auth-token'

function getRedirectUrl(request: NextRequest, path: string) {
  return new URL(path, request.url)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(
      getRedirectUrl(request, '/auth/login?error=invalid_magic_link'),
    )
  }

  const link = await consumeMagicLink(token)
  if (!link) {
    return NextResponse.redirect(
      getRedirectUrl(request, '/auth/login?error=expired_magic_link'),
    )
  }

  const memberships = await prisma.organizationMembers.findMany({
    where: { userId: link.userId },
    select: { organizationId: true },
  })
  const organizationIds = memberships
    .map(member => member.organizationId)
    .filter((id): id is string => Boolean(id))

  if (organizationIds.length === 0) {
    return NextResponse.redirect(
      getRedirectUrl(request, '/auth/login?error=no_organization'),
    )
  }

  const authToken = signAuthToken({ userId: link.userId }, '7d')
  const preferredOrganizationId = link.organizationId
  const selectedOrganizationId =
    preferredOrganizationId &&
    organizationIds.includes(preferredOrganizationId)
      ? preferredOrganizationId
      : organizationIds[0]

  const destination =
    organizationIds.length > 1
      ? `/auth/select-organization?preferred=${encodeURIComponent(selectedOrganizationId)}`
      : '/dashboard'
  const response = NextResponse.redirect(getRedirectUrl(request, destination))

  response.cookies.set('auth_token', authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  if (organizationIds.length === 1) {
    response.cookies.set('current_organization_id', selectedOrganizationId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  return response
}
