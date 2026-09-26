import { Resend } from 'resend'
import { renderEmailVerificationEmail } from './emails/email-verification'
import { renderLoginOTPEmail } from './emails/login-otp'
import { renderVerifyOtpEmail } from './emails/verify-otp'
import { renderMagicLinkEmail } from './emails/magic-link'
import {
  renderMembershipRemovedEmail,
  renderMembershipRoleUpdatedEmail,
} from './emails/membership'

function getDefaultSender(): { email: string; name: string } {
  const email = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const name =
    process.env.RESEND_FROM_NAME ||
    process.env.NEXT_PUBLIC_APP_NAME ||
    'Your workspace'

  return { email, name }
}

/**
 * Sends an email using Resend.
 */
async function sendEmail(params: {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  from?: { email: string; name: string }
  replyTo?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}): Promise<{ messageId: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required')
  }

  const resend = new Resend(apiKey)
  const defaultSender = getDefaultSender()
  const {
    to,
    subject,
    htmlBody,
    textBody,
    from = defaultSender,
    replyTo,
    attachments,
  } = params

  const toAddresses = Array.isArray(to) ? to : [to]
  const replyToAddresses = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined

  try {
    const { data, error } = await resend.emails.send({
      from: `${from.name} <${from.email}>`,
      to: toAddresses,
      subject,
      html: htmlBody,
      ...(textBody ? { text: textBody } : {}),
      ...(replyToAddresses ? { replyTo: replyToAddresses } : {}),
      ...(attachments?.length ? { attachments } : {}),
    })

    if (error) {
      throw new Error(error.message)
    }

    if (!data?.id) {
      throw new Error('No message ID returned from Resend')
    }

    return { messageId: data.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send email: ${errorMessage}`)
  }
}

/**
 * Sends a password reset email.
 * 
 * @param to - Recipient email address
 * @param resetLink - Password reset link with token
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
/**
 * Sends an email verification email.
 * 
 * @param to - Recipient email address
 * @param verificationLink - Email verification link with token
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
export async function sendEmailVerificationEmail(
  to: string,
  verificationLink: string,
  expiresInMinutes: number = 1440 // 24 hours
): Promise<{ messageId: string }> {
  const { html, text } = renderEmailVerificationEmail({
    verificationLink,
    expiresInMinutes,
  })

  return sendEmail({
    to,
    subject: 'Verify Your Email Address',
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends a login OTP email.
 * 
 * @param to - Recipient email address
 * @param otp - One-time password code
 * @param expiresInMinutes - Expiration time in minutes (for display purposes)
 */
export async function sendLoginOTPEmail(
  to: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<{ messageId: string }> {
  const { html, text } = renderLoginOTPEmail({
    otp,
    expiresInMinutes,
  })

  return sendEmail({
    to,
    subject: 'Your Login Code',
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends an email OTP used for verifying an email (e.g. signup flow).
 */
export async function sendVerifyEmailOtp(
  to: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<{ messageId: string }> {
  const { html, text } = renderVerifyOtpEmail({ otp, expiresInMinutes })
  return sendEmail({
    to,
    subject: 'Verify your email',
    htmlBody: html,
    textBody: text,
  })
}

export async function sendOrganizationMagicLinkEmail(params: {
  to: string
  magicLink: string
  organizationName: string
  inviterName?: string
  expiresInMinutes: number
}) {
  const { html, text } = renderMagicLinkEmail(params)
  return sendEmail({
    to: params.to,
    subject: `Your invitation to ${params.organizationName}`,
    htmlBody: html,
    textBody: text,
  })
}

export async function sendMembershipRoleUpdatedEmail(params: {
  to: string
  organizationName: string
  role: string
  administratorName: string
}) {
  const { html, text } = renderMembershipRoleUpdatedEmail(params)
  return sendEmail({
    to: params.to,
    subject: `Your role in ${params.organizationName} was updated`,
    htmlBody: html,
    textBody: text,
  })
}

export async function sendMembershipRemovedEmail(params: {
  to: string
  organizationName: string
  administratorName: string
}) {
  const { html, text } = renderMembershipRemovedEmail(params)
  return sendEmail({
    to: params.to,
    subject: `Your access to ${params.organizationName} was removed`,
    htmlBody: html,
    textBody: text,
  })
}

/**
 * Sends a password reset OTP email.
 */
/**
 * Generic function to send custom emails.
 * Use this for emails that don't fit the predefined templates.
 * 
 * @param params - Email parameters
 */
export async function sendCustomEmail(params: {
  to: string | string[]
  subject: string
  htmlBody: string
  textBody?: string
  from?: { email: string; name: string }
  replyTo?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}): Promise<{ messageId: string }> {
  return sendEmail(params)
}

export async function sendFeedbackEmail(params: {
  message: string
  userName: string
  userEmail: string
  userId: string
  organizationName: string
  sourceUrl?: string
  userAgent?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}) {
  const escaped = (value: string) =>
    value.replace(
      /[&<>"']/g,
      character =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] ?? character,
    )
  const message = escaped(params.message).replace(/\r?\n/g, '<br />')
  const text = [
    `Submitted by: ${params.userName}`,
    `User email: ${params.userEmail}`,
    `User ID: ${params.userId}`,
    `Organization: ${params.organizationName}`,
    `Submitted at: ${new Date().toISOString()}`,
    `Source page: ${params.sourceUrl || 'Dashboard'}`,
    `User agent: ${params.userAgent || 'Not available'}`,
    '',
    params.message,
  ].join('\n')

  return sendEmail({
    to: 'ilamuhil@gmail.com',
    subject: `Dashboard feedback from ${params.organizationName}`,
    htmlBody: `
      <h2>Dashboard feedback</h2>
      <h3>Reporter information</h3>
      <p><strong>Submitted by:</strong> ${escaped(params.userName)}</p>
      <p><strong>User email:</strong> ${escaped(params.userEmail)}</p>
      <p><strong>User ID:</strong> ${escaped(params.userId)}</p>
      <p><strong>Organization:</strong> ${escaped(params.organizationName)}</p>
      <p><strong>Submitted at:</strong> ${new Date().toISOString()}</p>
      <p><strong>Source page:</strong> ${escaped(params.sourceUrl || 'Dashboard')}</p>
      <p><strong>User agent:</strong> ${escaped(params.userAgent || 'Not available')}</p>
      <hr />
      <p>${message}</p>
    `,
    textBody: text,
    attachments: params.attachments,
    replyTo: params.userEmail,
  })
}
