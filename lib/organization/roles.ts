/** Canonical membership roles; values match the API and widget contracts. */
export enum OrganizationRole {
  Owner = 'owner',
  Admin = 'admin',
  Counsellor = 'counsellor',
  Viewer = 'viewer',
}
export const organizationRoles = [
  OrganizationRole.Owner,
  OrganizationRole.Admin,
  OrganizationRole.Counsellor,
  OrganizationRole.Viewer,
] as const
export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === 'string' &&
    organizationRoles.some((role) => role === value)
  )
}
