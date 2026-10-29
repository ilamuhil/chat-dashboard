import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const GOOGLE_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth'

export const GOOGLE_OAUTH_SCOPES = ['openid', 'email', 'profile'] as const

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${(
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:4000'
    ).replace(/\/$/, '')}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured')
  }

  return { clientId, clientSecret, redirectUri }
}

export function createOAuthSecret() {
  return randomBytes(32).toString('base64url')
}

export function createPkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function isSameOAuthSecret(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  )
}

export function buildGoogleAuthorizationUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}) {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  url.search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString()

  return url
}
