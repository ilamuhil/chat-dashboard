import { OrganizationRole, isOrganizationRole } from './roles'
export {
  OrganizationRole,
  isOrganizationRole,
  organizationRoles,
} from './roles'
export type Permission =
  'read' | 'operate' | 'configure' | 'members' | 'export' | 'billing'
export function can(role: unknown, permission: Permission): boolean {
  if (!isOrganizationRole(role)) return false
  if (permission === 'read') return true
  if (permission === 'operate') return role !== OrganizationRole.Viewer
  if (permission === 'billing') return role === OrganizationRole.Owner
  return role === OrganizationRole.Owner || role === OrganizationRole.Admin
}
export function canManageRole(actor: unknown, target: unknown, next?: unknown) {
  const ordinary = (role: unknown) =>
    role === OrganizationRole.Counsellor || role === OrganizationRole.Viewer
  return (
    actor === OrganizationRole.Owner ||
    (actor === OrganizationRole.Admin &&
      ordinary(target) &&
      (next === undefined || ordinary(next)))
  )
}
