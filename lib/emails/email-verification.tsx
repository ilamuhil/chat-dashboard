/**
 * Email verification template
 */

interface EmailVerificationEmailProps {
  verificationLink: string
  expiresInMinutes: number
}

export function renderEmailVerificationEmail({ verificationLink, expiresInMinutes }: EmailVerificationEmailProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Chat Dashboard'
  const hours = Math.floor(expiresInMinutes / 60)
  const minutes = expiresInMinutes % 60
  const expiryText = hours > 0 
    ? `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`
    : `${minutes} minute${minutes > 1 ? 's' : ''}`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email Address</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Verify Your Email Address</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for signing up for ${appName}! To complete your registration and activate your account, please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${verificationLink}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px; padding: 12px; background-color: #f5f5f5; border-radius: 4px; word-break: break-all; color: #10b981; font-size: 14px; font-family: monospace;">
                ${verificationLink}
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This verification link will expire in ${expiryText}. If you didn't create an account with ${appName}, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                If you're having trouble clicking the button, copy and paste the URL above into your web browser.
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} ${appName}. All rights reserved.
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

  const text = `
Verify Your Email Address

Hello,

Thank you for signing up for ${appName}! To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in ${expiryText}. If you didn't create an account with ${appName}, you can safely ignore this email.

If you're having trouble clicking the link, copy and paste it into your web browser.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim()

  return { html, text }
}
