import {
  escapeHtml,
  formatExpiry,
  getEmailAppName,
  renderEmailLayout,
} from './email-layout'

export function renderMagicLinkEmail(params: {
  magicLink: string
  organizationName: string
  inviterName?: string
  expiresInMinutes: number
}) {
  const appName = getEmailAppName()
  const safeAppName = escapeHtml(appName)
  const safeOrganizationName = escapeHtml(params.organizationName)
  const safeInviterName = escapeHtml(params.inviterName || 'an organization administrator')
  const safeLink = escapeHtml(params.magicLink)
  const expiryText = formatExpiry(params.expiresInMinutes)

  const html = renderEmailLayout({
    previewText: `Your invitation to ${safeOrganizationName}`,
    eyebrow: 'Organization invitation',
    title: `Join ${safeOrganizationName}`,
    body: `
      <p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">
        ${safeInviterName} invited you to access ${safeOrganizationName} on ${safeAppName}.
      </p>
      <p style="margin: 26px 0;">
        <a href="${safeLink}" style="display: inline-block; border-radius: 10px; background: #0369a1; color: #ffffff; padding: 12px 20px; font-size: 14px; font-weight: 600; text-decoration: none;">
          Open dashboard
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px; line-height: 1.65;">
        This secure link expires in ${escapeHtml(expiryText)} and can only be used once.
      </p>
    `,
    footerNote: `If you did not expect this invitation, you can safely ignore this email.`,
  })

  const text = `
${params.inviterName || 'An organization administrator'} invited you to join ${params.organizationName} on ${appName}.

Open your dashboard:
${params.magicLink}

This link expires in ${expiryText} and can only be used once.
  `.trim()

  return { html, text }
}
