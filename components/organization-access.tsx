'use client'
import {
  createContext,
  useContext,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { can, type Permission } from '@/lib/organization/permissions'
const RoleContext = createContext<string>('')
export function OrganizationAccessProvider({
  role,
  children,
}: {
  role: string
  children: ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}
export function useOrganizationAccess() {
  const role = useContext(RoleContext)
  return { role, can: (permission: Permission) => can(role, permission) }
}
export function RequirePermission({
  permission,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  permission: Permission
  children: ReactNode
}) {
  const access = useOrganizationAccess()
  return access.can(permission) ? <Slot {...props}>{children}</Slot> : null
}
