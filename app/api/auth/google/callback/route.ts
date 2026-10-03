import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { signAuthToken } from '@/lib/auth-token'
import {
  getGoogleOAuthConfig,
  isSameOAuthSecret,
} from '@/lib/google-oauth'

export const runtime = 'nodejs'

const STATE_COOKIE = 'google_oauth_state'
const VERIFIER_COOKIE = 'google_oauth_verifier'

type GoogleTokenResponse = {
  access_token?: string
  error?: string
}

type GoogleUserInfo = {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

function redirectToLogin(request: NextRequest, error: string) {
  const url = new URL('/auth/login', request.url)
  url.searchParams.set('error', error)
  const response = NextResponse.redirect(url)

  response.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(VERIFIER_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}

function renderExistingAccountMessage(request: NextRequest) {
  const loginUrl = new URL('/auth/login', request.url)

  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Use email OTP to sign in</title>
  </head>
  <body style="margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <main style="box-sizing:border-box;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <section style="width:100%;max-width:440px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:40px;box-shadow:0 16px 40px rgba(15,23,42,.08);text-align:center;">
        <div style="width:48px;height:48px;line-height:48px;margin:0 auto 20px;border-radius:16px;background:#fef3c7;color:#b45309;font-size:22px;">!</div>
        <h1 style="margin:0;font-size:24px;line-height:1.25;">This email already has an account.</h1>
        <p style="margin:12px 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
          Sign in with email OTP instead.
        </p>
        <a href="${loginUrl.toString()}" style="display:inline-block;border-radius:12px;background:#0f172a;color:#fff;padding:13px 22px;font-size:14px;font-weight:600;text-decoration:none;">
          Continue with email OTP
        </a>
      </section>
    </main>
  </body>
</html>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html; charset=utf-8',
      },
      status: 409,
    },
  )
}

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error')
  const code = request.nextUrl.searchParams.get('code')
  const receivedState = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get(STATE_COOKIE)?.value
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value

  if (error === 'access_denied') {
    return redirectToLogin(request, 'google_cancelled')
  }

  if (!code || !receivedState || !storedState || !verifier) {
    return redirectToLogin(request, 'google_invalid_callback')
  }

  if (!isSameOAuthSecret(storedState, receivedState)) {
    return redirectToLogin(request, 'google_invalid_callback')
  }

  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      cache: 'no-store',
    })

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error || 'Google token exchange failed')
    }

    const userInfoResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
        cache: 'no-store',
      },
    )
    const profile = (await userInfoResponse.json()) as GoogleUserInfo

    if (
      !userInfoResponse.ok ||
      !profile.sub ||
      !profile.email ||
      profile.email_verified !== true
    ) {
      return redirectToLogin(request, 'google_unverified')
    }

    const email = profile.email.trim().toLowerCase()
    let user = await prisma.users.findUnique({
      where: { googleId: profile.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        onboardingCompleted: true,
        isActive: true,
        isBanned: true,
      },
    })

    if (user) {
      if (user.email?.toLowerCase() !== email) {
        return redirectToLogin(request, 'google_account_mismatch')
      }

      if (user.isBanned || !user.isActive) {
        return redirectToLogin(request, 'google_account_unavailable')
      }

      await prisma.users.update({
        where: { id: user.id },
        data: {
          googleEmail: email,
          lastLoggedIn: new Date(),
        },
      })
    } else {
      const existingUser = await prisma.users.findUnique({
        where: { email },
        select: { id: true },
      })

      if (existingUser) {
        return renderExistingAccountMessage(request)
      }

      user = await prisma.users.create({
        data: {
          email,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          fullName: profile.name ?? null,
          avatarUrl: profile.picture ?? null,
          googleId: profile.sub,
          googleEmail: email,
          lastLoggedIn: new Date(),
          onboardingCompleted: false,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          onboardingCompleted: true,
          isActive: true,
          isBanned: true,
        },
      })
    }

    const memberships = await prisma.organizationMembers.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    })
    const organizationIds = memberships
      .map((membership) => membership.organizationId)
      .filter((id): id is string => Boolean(id))
    const onboardingCompleted =
      user.onboardingCompleted || organizationIds.length > 0

    if (onboardingCompleted && !user.onboardingCompleted) {
      await prisma.users.update({
        where: { id: user.id },
        data: { onboardingCompleted: true },
      })
    }

    const token = signAuthToken({ userId: user.id }, '7d')
    const destination =
      !onboardingCompleted
        ? '/onboarding'
        : organizationIds.length > 1
          ? '/auth/select-organization'
          : '/dashboard'
    const response = NextResponse.redirect(
      new URL(destination, request.url),
    )

    setAuthCookie(response, token)
    if (organizationIds.length === 1) {
      response.cookies.set('current_organization_id', organizationIds[0], {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    response.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })
    response.cookies.set(VERIFIER_COOKIE, '', { maxAge: 0, path: '/' })
    return response
  } catch (error) {
    console.error('[auth/google/callback] Google sign-in failed:', error)
    return redirectToLogin(request, 'google_error')
  }
}
