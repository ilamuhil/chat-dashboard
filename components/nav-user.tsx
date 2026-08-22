'use client'

import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import useSignout from '../hooks/use-signout'

type AppUser = {
  id: string
  email?: string | null
  fullName?: string | null
  avatarUrl?: string | null
}

function getInitials(name: string | null | undefined): string {
  if (!name || name.trim() === '') return 'U'
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0)
  if (parts.length >= 2) {
    const first = parts[0][0]?.toUpperCase() || ''
    const last = parts[parts.length - 1][0]?.toUpperCase() || ''
    return (first + last) || 'U'
  }
  if (parts.length === 1) {
    return parts[0][0]?.toUpperCase() || 'U'
  }
  return 'U'
}

function capitalizeName(name: string): string {
  if (!name) return ''
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function NavUser({ user }: { user: AppUser }) {
  const { isMobile } = useSidebar()
  const { signOut } = useSignout()

  const fullName = user.fullName || ''
  const rawDisplayName = fullName || user.email?.split('@')[0] || 'User'
  const displayName = capitalizeName(rawDisplayName)
  const initials = getInitials(fullName || rawDisplayName)
  const email = user.email || ''

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='h-12 rounded-xl border border-slate-200/80 bg-white px-2.5 shadow-sm transition-colors hover:bg-sky-50/60 data-[state=open]:bg-sky-50/80 data-[state=open]:ring-1 data-[state=open]:ring-sky-200/70'>
              <Avatar className='h-8 w-8 rounded-lg ring-1 ring-slate-200/80'>
                <AvatarImage
                  src={user.avatarUrl ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className='rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-xs font-semibold text-white'>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold text-slate-900'>
                  {displayName}
                </span>
                <span className='truncate text-[10px] text-slate-500'>
                  {email}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto size-4 text-slate-400' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border-slate-200'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}>
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg ring-1 ring-slate-200/80'>
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={displayName}
                  />
                  <AvatarFallback className='rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-xs font-semibold text-white'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{displayName}</span>
                  <span className='truncate text-[10px] text-muted-foreground'>
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className='rounded-lg'>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem className='rounded-lg'>
                <CreditCard />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='rounded-lg text-rose-600 focus:text-rose-600'
              onClick={signOut}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
