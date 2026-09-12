import fs from 'node:fs'
import path from 'node:path'

type EmailValidationResult =
  | { isValid: true }
  | { isValid: false; errorMessage: string }

const blocklistPath = path.join(
  process.cwd(),
  'config',
  'disposable_email_blocklist.conf',
)

const blockedDomains = new Set(
  fs
    .readFileSync(blocklistPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#')),
)

export function validateEmail(email: string): EmailValidationResult {
  const value = email.trim().toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(value)) {
    return {
      isValid: false,
      errorMessage: 'Invalid email format',
    }
  }

  const domain = value.slice(value.lastIndexOf('@') + 1)
  const isDisposable = [...blockedDomains].some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`),
  )

  if (isDisposable) {
    return {
      isValid: false,
      errorMessage: 'Disposable email addresses are not allowed',
    }
  }

  return { isValid: true }
}
