import type { Permission } from './permissions'
// Shared by the request boundary and route guards. Machine-authenticated jobs,
// payment callbacks and public widget endpoints retain their own authentication.
export function requestPermission(
  path: string,
  method: string,
): Permission | null {
  if (
    [
      '/api/billing/webhook',
      '/api/billing/return',
      '/api/billing/maintenance',
      '/api/dashboard/leads/maintenance',
    ].includes(path)
  )
    return null
  if (path.startsWith('/api/billing')) return 'billing'
  if (path.startsWith('/api/training') || path.startsWith('/api/bots'))
    return 'configure'
  if (path.startsWith('/api/dashboard/org-members')) return 'members'
  if (path === '/api/dashboard/leads/export') return 'export'
  if (path === '/api/auth/agent/token' || path === '/api/conversations/upload')
    return 'operate'
  if (path.startsWith('/api/dashboard/'))
    return ['GET', 'HEAD'].includes(method) ? 'read' : 'operate'
  if (path === '/api/auth/sse' || path.startsWith('/api/notifications'))
    return 'read'
  if (
    path.startsWith('/dashboard/bot') ||
    path.startsWith('/dashboard/profile')
  )
    return 'configure'
  if (path.startsWith('/dashboard/users/org-members')) return 'members'
  if (
    path.startsWith('/dashboard/billing') ||
    path.startsWith('/dashboard/subscription')
  )
    return 'billing'
  if (path.startsWith('/dashboard')) return 'read'
  return null
}
