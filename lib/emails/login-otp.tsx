/**
 * Login OTP email template
 */

interface LoginOTPEmailProps {
  otp: string
  expiresInMinutes: number
}

export function renderLoginOTPEmail({ otp, expiresInMinutes }: LoginOTPEmailProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Chat Dashboard'
  const minutes = expiresInMinutes
  const expiryText = `${minutes} minute${minutes > 1 ? 's' : ''}`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Your Login Code</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 20px; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You requested a login code for your ${appName} account. Use the code below to complete your login:
              </p>
              
              <!-- OTP Code Box -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="display: inline-block; padding: 20px 40px; background-color: #f3f4f6; border: 2px dashed #9ca3af; border-radius: 8px;">
                      <div style="font-size: 32px; font-weight: 700; color: #1f2937; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                This code will expire in ${expiryText}. For security reasons, please do not share this code with anyone.
              </p>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If you didn't request this login code, you can safely ignore this email. Your account remains secure.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                For your security, never share this code with anyone. ${appName} staff will never ask for your login code.
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
Your Login Code

Hello,

You requested a login code for your ${appName} account. Use the code below to complete your login:

${otp}

This code will expire in ${expiryText}. For security reasons, please do not share this code with anyone.

If you didn't request this login code, you can safely ignore this email. Your account remains secure.

For your security, never share this code with anyone. ${appName} staff will never ask for your login code.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim()

  return { html, text }
}
