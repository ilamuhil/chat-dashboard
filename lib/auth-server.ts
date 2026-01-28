import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAuthToken } from '@/lib/auth-token'
import { prisma } from '@/lib/prisma'
import { CURRENT_ORG_COOKIE } from '@/lib/current-organization'

export async function getAuthUserIdFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try {
    return verifyAuthToken(token).sub
  } catch {
    return null
  }
}

export async function requireAuthUserId(): Promise<string> {
  const userId = await getAuthUserIdFromCookies()
  if (!userId) redirect('/auth/login')
  return userId
}

export async function requireAuthUser() {
  const userId = await requireAuthUserId()
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, avatarUrl: true },
  })
  if (!user) redirect('/auth/login')
  return user
}

export async function getOnboardingStatus(userId: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true, email: true },
    })
    if (!user) return { isComplete: false }

    const membership = await prisma.organizationMembers.findFirst({
      where: { userId },
      select: { organizationId: true },
    })

    const isComplete = user.onboardingCompleted || !!membership
    if (isComplete && !user.onboardingCompleted) {
      await prisma.users.update({
        where: { id: userId },
        data: { onboardingCompleted: true },
      })
    }

    return {
      isComplete,
      organizationId: membership?.organizationId ?? null,
    }
  } catch (error) {
    console.error('getOnboardingStatus failed:', error)
    return { isComplete: false }
  }
}

export async function setCurrentOrganizationCookie(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

