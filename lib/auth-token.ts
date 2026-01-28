import jwt from 'jsonwebtoken'

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
  expiresIn: jwt.SignOptions['expiresIn'] = '7d'
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

export function verifyAuthToken(token: string): AuthTokenPayload {
  const secret = mustGetEnv('AUTH_JWT_SECRET')
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'chat-dashboard',
    audience: 'chat-dashboard-web',
  })
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token payload')
  }
  const sub = (decoded as any).sub
  const type = (decoded as any).type
  if (typeof sub !== 'string' || type !== 'access') {
    throw new Error('Invalid token payload')
  }
  return { sub, type }
}

