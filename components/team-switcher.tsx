'use client'

import * as React from 'react'
import { ChevronsUpDown, Plus } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

type Team = {
  id: string
  name: string
  logo: React.ElementType
  plan: string
}

function subscribeToOrgStorage(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getStoredOrgId() {
  try {
    return window.localStorage.getItem('current_organization_id')
  } catch {
    return null
  }
}

export function TeamSwitcher({ teams }: { teams: Team[] }) {
  const { isMobile } = useSidebar()
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(
    null
  )

  const storedOrgId = React.useSyncExternalStore(
    subscribeToOrgStorage,
    getStoredOrgId,
    () => null
  )

  const activeTeam =
    teams.find(t => t.id === (selectedTeamId ?? storedOrgId)) ?? teams[0]

  const selectTeam = React.useCallback((team: Team) => {
    setSelectedTeamId(team.id)
    try {
      window.localStorage.setItem('current_organization_id', team.id)
      document.cookie = `current_organization_id=${encodeURIComponent(
        team.id
      )}; Path=/; SameSite=Lax`
    } catch {
      // ignore
    }
  }, [])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='h-12 rounded-xl border border-slate-200/80 bg-white px-2.5 shadow-sm transition-colors hover:bg-sky-50/60 data-[state=open]:bg-sky-50/80 data-[state=open]:ring-1 data-[state=open]:ring-sky-200/70'>
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
                <activeTeam.logo className='size-4' />
              </div>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold text-slate-900'>
                  {activeTeam.name}
                </span>
                <span className='truncate text-xs capitalize text-slate-500'>
                  {activeTeam.plan}
                </span>
              </div>
              <ChevronsUpDown className='ml-auto size-4 text-slate-400' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border-slate-200'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}>
            <DropdownMenuLabel className='text-xs text-slate-500'>
              Organizations
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => selectTeam(team)}
                className='gap-2 rounded-lg p-2'>
                <div className='flex size-6 items-center justify-center rounded-md border border-slate-200 bg-slate-50'>
                  <team.logo className='size-3.5 shrink-0 text-slate-600' />
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className='gap-2 rounded-lg p-2'>
              <div className='flex size-6 items-center justify-center rounded-md border border-dashed border-slate-300 bg-transparent'>
                <Plus className='size-4 text-slate-500' />
              </div>
              <div className='font-medium text-slate-600'>Add organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
