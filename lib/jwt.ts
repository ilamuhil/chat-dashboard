import jwt, { type SignOptions } from 'jsonwebtoken'
import fs from 'node:fs'
import path from 'node:path'

export function getSecretKey(): string | null {
  try {
    const privateKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'private.pem'),
      'utf8',
    )
    if (!privateKey) {
      console.error('Private key not found')
      return null
    }
    return privateKey
  } catch (error) {
    console.error('Error reading private key:', error)
    return null
  }
}

export function signToken(
  payload: {
    organization_id: string
    bot_id: string
    conversation_id?: string
    type: 'user' | 'agent'
    [key: string]: unknown
  },
  privateKey: string,
  expiresIn: SignOptions['expiresIn'] = '30m',
): string {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn,
      issuer: 'next-server',
      audience: 'chat-server',
    },
  )
}

export type ChatTokenPayload = {
  organization_id: string
  bot_id: string
  conversation_id?: string
  type: 'user' | 'agent'
  [key: string]: unknown
}

export function verifyToken(token: string): ChatTokenPayload | null {
  const privateKey = getSecretKey()
  if (!privateKey) {
    console.error('Error verifying token: private key not available')
    return null
  }
  try {
    const decoded = jwt.verify(token, privateKey, {
      algorithms: ['RS256'],
      issuer: 'next-server',
      audience: 'chat-server',
    })
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      Array.isArray(decoded)
    ) {
      return null
    }
    return decoded as ChatTokenPayload
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}
