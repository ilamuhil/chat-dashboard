type EmailLayoutOptions = {
  previewText: string
  eyebrow: string
  title: string
  body: string
  footerNote: string
}

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )
}

export function getEmailAppName(): string {
  return process.env.NEXT_PUBLIC_APP_NAME || 'Your workspace'
}

export function formatExpiry(expiresInMinutes: number): string {
  const hours = Math.floor(expiresInMinutes / 60)
  const minutes = expiresInMinutes % 60

  if (hours === 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }

  const hourText = `${hours} hour${hours === 1 ? '' : 's'}`
  const minuteText =
    minutes > 0
      ? ` and ${minutes} minute${minutes === 1 ? '' : 's'}`
      : ''

  return `${hourText}${minuteText}`
}

export function renderOtpCode(otp: string): string {
  const digits = otp.split('').map(escapeHtml)

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
      <tr>
        ${digits
          .map(
            (digit, index) => `
          <td style="padding: 0 ${index === 0 || index === digits.length - 1 ? '4px' : '5px'};">
            <div style="width: 54px; height: 60px; line-height: 60px; border: 1px solid #bae6fd; border-radius: 12px; background-color: #f0f9ff; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 27px; font-weight: 700; text-align: center;">
              ${digit}
            </div>
          </td>`,
          )
          .join('')}
      </tr>
    </table>
  `.trim()
}

export function renderEmailLayout({
  previewText,
  eyebrow,
  title,
  body,
  footerNote,
}: EmailLayoutOptions): string {
  const appName = escapeHtml(getEmailAppName())
  const year = new Date().getFullYear()

  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-shell { padding: 20px 12px !important; }
      .email-card { border-radius: 16px !important; }
      .email-header { padding: 22px 22px !important; }
      .email-content { padding: 32px 22px 28px !important; }
      .email-footer { padding: 22px !important; }
      .email-title { font-size: 26px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
    ${escapeHtml(previewText)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #f1f5f9;">
    <tr>
      <td class="email-shell" align="center" style="padding: 48px 20px;">
        <table class="email-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);">
          <tr>
            <td class="email-header" style="padding: 24px 34px; background-color: #0f172a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 38px;">
                    <div style="width: 36px; height: 36px; line-height: 36px; border-radius: 10px; background-color: #0ea5e9; color: #ffffff; font-size: 18px; font-weight: 700; text-align: center;">✦</div>
                  </td>
                  <td style="padding-left: 11px; color: #ffffff; font-size: 16px; font-weight: 650; letter-spacing: -0.2px;">
                    ${appName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding: 42px 42px 36px;">
              <p style="margin: 0 0 13px; color: #0284c7; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;">
                ${escapeHtml(eyebrow)}
              </p>
              <h1 class="email-title" style="margin: 0; color: #0f172a; font-size: 30px; font-weight: 700; line-height: 1.2; letter-spacing: -0.8px;">
                ${escapeHtml(title)}
              </h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding: 24px 42px; border-top: 1px solid #e2e8f0; background-color: #f8fafc;">
              <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.7;">
                ${footerNote}
              </p>
              <p style="margin: 12px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.6;">
                © ${year} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
