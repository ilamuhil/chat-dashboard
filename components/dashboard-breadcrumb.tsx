'use client'

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Map routes to their display titles
const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/overview': 'Overview',
  '/dashboard/bot/interactions': 'Interactions',
  '/dashboard/bot/training': 'Training Data',
  '/dashboard/bot/api': 'API Setup',
  '/dashboard/users/conversations': 'Conversations',
  '/dashboard/users/leads': 'Leads',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/profile': 'Profile',
  '/dashboard/subscription': 'Subscription',
}

// Map parent routes for breadcrumb hierarchy
const parentRoutes: Record<string, { title: string; url: string } | null> = {
  '/dashboard/overview': null,
  '/dashboard/bot/interactions': {
    title: 'Bot Configuration',
    url: '/dashboard/bot',
  },
  '/dashboard/bot/training': {
    title: 'Bot Configuration',
    url: '/dashboard/bot',
  },
  '/dashboard/bot/api': { title: 'Bot Configuration', url: '/dashboard/bot' },
  '/dashboard/users/conversations': {
    title: 'Users',
    url: '/dashboard/users',
  },
  '/dashboard/users/leads': { title: 'Users', url: '/dashboard/users' },
  '/dashboard/analytics': null,
  '/dashboard/profile': null,
  '/dashboard/subscription': null,
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const matchedPath =
    Object.keys(routeTitles)
      .filter(route => pathname === route || pathname.startsWith(route + '/'))
      .sort((a, b) => b.length - a.length)[0] ?? pathname
  const currentTitle = routeTitles[matchedPath] || 'Dashboard'
  const parent = parentRoutes[matchedPath]

  return (
    <Breadcrumb>
      <BreadcrumbList className='gap-1.5 sm:gap-1.5'>
        <BreadcrumbItem className='hidden md:block'>
          <BreadcrumbLink
            href='/dashboard'
            className='text-xs font-medium text-slate-500 transition-colors hover:text-sky-700'>
            Dashboard
          </BreadcrumbLink>
        </BreadcrumbItem>
        {parent && (
          <>
            <BreadcrumbSeparator className='hidden text-slate-300 md:block' />
            <BreadcrumbItem className='hidden md:block'>
              <BreadcrumbLink
                href={parent.url}
                className='text-xs font-medium text-slate-500 transition-colors hover:text-sky-700'>
                {parent.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator className='hidden text-slate-300 md:block' />
        <BreadcrumbItem>
          <BreadcrumbPage className='rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-900 ring-1 ring-sky-200/70'>
            {currentTitle}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
