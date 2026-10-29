import jwt from 'jsonwebtoken'
import { getSecretKey } from '@/lib/jwt'

//! All the functions here are between the dasboard client and the dashboard server. This is independent of the chat server

export type SSEAuthTokenPayload = {
  sub: string // userId (uuid)
  type: 'sse' // sse token
  organization_id: string // organizationId (uuid)
}

export type AuthTokenPayload = {
  sub: string // userId (uuid)
  type: 'access'
}

function mustGetEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

export function signAuthToken(
  payload: { userId: string },
  expiresIn: jwt.SignOptions['expiresIn'] = '7d',
) {
  const secret = mustGetEnv('AUTH_JWT_SECRET')
  const p: AuthTokenPayload = { sub: payload.userId, type: 'access' }
  return jwt.sign(p, secret, {
    algorithm: 'HS256',
    expiresIn,
    issuer: 'chat-dashboard',
    audience: 'chat-dashboard-web',
  })
}

export function signSSEAuthToken(payload: { userId: string; orgId: string }) {
  const privateKey = getSecretKey()
  if (!privateKey) {
    throw new Error('Private key not found at keys/private.pem')
  }

  const p: SSEAuthTokenPayload = {
    sub: payload.userId,
    type: 'sse',
    organization_id: payload.orgId,
  }
  return jwt.sign(p, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1d',
    issuer: 'dashboard-server',
    audience: 'chat-server',
  })
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const secret = mustGetEnv('AUTH_JWT_SECRET')
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'chat-dashboard',
    audience: 'chat-dashboard-web',
  })
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    Array.isArray(decoded)
  ) {
    throw new Error('Invalid token payload')
  }
  const payload = decoded as jwt.JwtPayload & { type?: unknown }
  const sub = payload.sub
  const type = payload.type
  if (typeof sub !== 'string' || type !== 'access') {
    throw new Error('Invalid token payload')
  }
  return { sub, type }
}
