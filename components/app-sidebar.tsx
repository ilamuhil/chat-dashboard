'use client'

import * as React from 'react'
import {
  GalleryVerticalEnd,
  Wallet,
  MonitorCog,
  MessageCircleMore,
  Users,
  LayoutDashboard,
  UserRoundPen,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

type AppUser = {
  id: string
  email?: string | null
  fullName?: string | null
  avatarUrl?: string | null
}

const data = {
  navMain: [
    {
      title: 'Overview',
      url: '/dashboard/overview',
      icon: LayoutDashboard,
    },
    {
      title: 'Bot Configuration',
      icon: MonitorCog,
      isActive: true,
      items: [
        {
          title: 'Interactions',
          url: '/dashboard/bot/interactions',
        },
        {
          title: 'Training Data',
          url: '/dashboard/bot/training',
        },
        {
          title: 'API Setup',
          url: '/dashboard/bot/api',
        },
      ],
    },
    {
      title: 'Users',
      icon: MessageCircleMore,
      isActive: true,
      items: [
        {
          title: 'Conversations',
          url: '/dashboard/users/conversations',
        },
        {
          title: 'Leads',
          url: '/dashboard/users/leads',
          icon: Users,
        },
      ],
    },
    {
      title: 'Profile',
      url: '/dashboard/profile',
      icon: UserRoundPen,
    },
    {
      title: 'Subscription',
      url: '/dashboard/subscription',
      icon: Wallet,
    },
  ],
}

export function AppSidebar({
  user,
  organizations,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AppUser
  organizations: { id: string; name: string; role: string }[]
}) {
  const orgsForSwitcher = organizations.map(org => ({
    id: org.id,
    name: org.name,
    logo: GalleryVerticalEnd,
    plan: org.role,
  }))

  return (
    <Sidebar
      collapsible='icon'
      className='border-r border-slate-200/80 bg-linear-to-b from-white via-slate-50/80 to-sky-50/40'
      {...props}>
      <SidebarHeader className='gap-2 px-2 py-3'>
        <TeamSwitcher teams={orgsForSwitcher} />
      </SidebarHeader>
      <div className='mx-2 min-w-0 overflow-hidden'>
        <SidebarSeparator className='mx-0 w-full bg-slate-200/80' />
      </div>
      <SidebarContent className='px-1 py-2'>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className='gap-2 border-t border-slate-200/70 px-2 py-3'>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
