import jwt from 'jsonwebtoken'
import fs from 'node:fs'
import path from 'node:path'

export function getSecretKey(): string | null {
  try {
    const privateKey = fs.readFileSync(
      path.join(process.cwd(), 'keys', 'private.pem'),
      'utf8'
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
    bot_id: number
    conversation_id: string
    type: 'user' | 'agent'
    [key: string]: unknown
  },
  privateKey: string
): string {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '5m',
      issuer: 'next-server',
      audience: 'chat-server',
    }
  )
}
