import {
  escapeHtml,
  formatExpiry,
  getEmailAppName,
  renderEmailLayout,
  renderOtpCode,
} from './email-layout'

interface LoginOTPEmailProps {
  otp: string
  expiresInMinutes: number
}

export function renderLoginOTPEmail({
  otp,
  expiresInMinutes,
}: LoginOTPEmailProps) {
  const appName = getEmailAppName()
  const safeAppName = escapeHtml(appName)
  const expiryText = formatExpiry(expiresInMinutes)

  const html = renderEmailLayout({
    previewText: `${otp} is your secure login code`,
    eyebrow: 'Secure sign in',
    title: 'Your login code',
    body: `
      <p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">
        Use this one-time code to securely sign in to ${safeAppName}.
      </p>
      <div style="margin: 30px 0;">
        ${renderOtpCode(otp)}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-radius: 12px; background-color: #f8fafc;">
        <tr>
          <td style="padding: 15px 18px; color: #64748b; font-size: 13px; line-height: 1.65;">
            <strong style="color: #334155;">Expires in ${escapeHtml(expiryText)}.</strong>
            This code can only be used once. Never share it with anyone.
          </td>
        </tr>
      </table>
    `,
    footerNote: `Didn't request this code? You can safely ignore this email. ${safeAppName} staff will never ask for your verification code.`,
  })

  const text = `
Your login code

Use this one-time code to securely sign in to ${appName}:

${otp}

This code expires in ${expiryText} and can only be used once.
Never share it with anyone.

If you didn't request this code, you can safely ignore this email.
  `.trim()

  return { html, text }
}
