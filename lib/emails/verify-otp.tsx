import {
  escapeHtml,
  formatExpiry,
  getEmailAppName,
  renderEmailLayout,
  renderOtpCode,
} from './email-layout'

interface VerifyOtpEmailProps {
  otp: string
  expiresInMinutes: number
}

export function renderVerifyOtpEmail({
  otp,
  expiresInMinutes,
}: VerifyOtpEmailProps) {
  const appName = getEmailAppName()
  const safeAppName = escapeHtml(appName)
  const expiryText = formatExpiry(expiresInMinutes)

  const html = renderEmailLayout({
    previewText: `${otp} is your email verification code`,
    eyebrow: 'Email verification',
    title: 'Confirm your email',
    body: `
      <p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">
        You’re almost there. Enter this code to confirm your email and finish creating your ${safeAppName} account.
      </p>
      <div style="margin: 30px 0;">
        ${renderOtpCode(otp)}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-radius: 12px; background-color: #f0f9ff;">
        <tr>
          <td style="padding: 15px 18px; color: #0369a1; font-size: 13px; line-height: 1.65;">
            This code expires in <strong>${escapeHtml(expiryText)}</strong> and can only be used once.
          </td>
        </tr>
      </table>
    `,
    footerNote: `If you didn't create an account with ${safeAppName}, no action is needed and you can safely ignore this email.`,
  })

  const text = `
Confirm your email

Enter this code to confirm your email and finish creating your ${appName} account:

${otp}

This code expires in ${expiryText} and can only be used once.

If you didn't create this account, you can safely ignore this email.
  `.trim()

  return { html, text }
}
