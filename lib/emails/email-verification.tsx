import {
  escapeHtml,
  formatExpiry,
  getEmailAppName,
  renderEmailLayout,
} from './email-layout'

interface EmailVerificationEmailProps {
  verificationLink: string
  expiresInMinutes: number
}

export function renderEmailVerificationEmail({
  verificationLink,
  expiresInMinutes,
}: EmailVerificationEmailProps) {
  const appName = getEmailAppName()
  const safeAppName = escapeHtml(appName)
  const safeLink = escapeHtml(verificationLink)
  const expiryText = formatExpiry(expiresInMinutes)

  const html = renderEmailLayout({
    previewText: `Verify your email address for ${appName}`,
    eyebrow: 'One last step',
    title: 'Verify your email',
    body: `
      <p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">
        Confirm this email address to activate your ${safeAppName} account and get started.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0 26px;">
        <tr>
          <td style="border-radius: 11px; background-color: #0284c7;">
            <a href="${safeLink}" style="display: inline-block; padding: 14px 24px; color: #ffffff; font-size: 14px; font-weight: 700; line-height: 1; text-decoration: none;">
              Verify email address&nbsp;&nbsp;→
            </a>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-radius: 12px; background-color: #f8fafc;">
        <tr>
          <td style="padding: 15px 18px; color: #64748b; font-size: 12px; line-height: 1.65;">
            <strong style="display: block; margin-bottom: 4px; color: #334155;">Button not working?</strong>
            Copy and paste this link into your browser:
            <br>
            <a href="${safeLink}" style="color: #0284c7; text-decoration: underline; word-break: break-all;">${safeLink}</a>
          </td>
        </tr>
      </table>
      <p style="margin: 20px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.65;">
        This link expires in ${escapeHtml(expiryText)}.
      </p>
    `,
    footerNote: `If you didn't create an account with ${safeAppName}, no action is needed and you can safely ignore this email.`,
  })

  const text = `
Verify your email

Confirm this email address to activate your ${appName} account:

${verificationLink}

This link expires in ${expiryText}.

If you didn't create this account, you can safely ignore this email.
  `.trim()

  return { html, text }
}
