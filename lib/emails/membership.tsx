import {
  escapeHtml,
  getEmailAppName,
  renderEmailLayout,
} from './email-layout'

export function renderMembershipRoleUpdatedEmail(params: {
  organizationName: string
  role: string
  administratorName: string
}) {
  const appName = getEmailAppName()
  const organizationName = escapeHtml(params.organizationName)
  const role = escapeHtml(params.role)
  const administratorName = escapeHtml(params.administratorName)
  const body = `Your role in ${params.organizationName} was updated to ${params.role} by ${params.administratorName}.`

  return {
    html: renderEmailLayout({
      previewText: body,
      eyebrow: 'Organization access updated',
      title: 'Your role was updated',
      body: `<p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">${administratorName} updated your role in ${organizationName} to <strong>${role}</strong>.</p>`,
      footerNote: `You received this notification from ${escapeHtml(appName)}.`,
    }),
    text: `${body}\n\nYou received this notification from ${appName}.`,
  }
}

export function renderMembershipRemovedEmail(params: {
  organizationName: string
  administratorName: string
}) {
  const appName = getEmailAppName()
  const organizationName = escapeHtml(params.organizationName)
  const administratorName = escapeHtml(params.administratorName)
  const body = `Your access to ${params.organizationName} has been removed by ${params.administratorName}.`

  return {
    html: renderEmailLayout({
      previewText: body,
      eyebrow: 'Organization access updated',
      title: 'Access removed',
      body: `<p style="margin: 18px 0 0; color: #475569; font-size: 15px; line-height: 1.75;">Your access to ${organizationName} has been removed by ${administratorName}, an organization administrator.</p>`,
      footerNote: `You received this notification from ${escapeHtml(appName)}.`,
    }),
    text: `${body}\n\nYou received this notification from ${appName}.`,
  }
}
