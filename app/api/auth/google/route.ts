import { NextRequest, NextResponse } from 'next/server'

import {
  buildGoogleAuthorizationUrl,
  createOAuthSecret,
  createPkceChallenge,
  getGoogleOAuthConfig,
} from '@/lib/google-oauth'

export const runtime = 'nodejs'

const STATE_COOKIE = 'google_oauth_state'
const VERIFIER_COOKIE = 'google_oauth_verifier'
const COOKIE_MAX_AGE = 10 * 60

function redirectToLogin(request: NextRequest, error: string) {
  const url = new URL('/auth/login', request.url)
  url.searchParams.set('error', error)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  try {
    const { clientId, redirectUri } = getGoogleOAuthConfig()
    const state = createOAuthSecret()
    const verifier = createOAuthSecret()
    const authorizationUrl = buildGoogleAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge: createPkceChallenge(verifier),
    })

    const response = NextResponse.redirect(authorizationUrl)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    }

    response.cookies.set(STATE_COOKIE, state, cookieOptions)
    response.cookies.set(VERIFIER_COOKIE, verifier, cookieOptions)
    return response
  } catch (error) {
    console.error('[auth/google] Failed to start Google OAuth:', error)
    return redirectToLogin(request, 'google_not_configured')
  }
}
