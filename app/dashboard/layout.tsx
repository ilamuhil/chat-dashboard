import { AppSidebar } from '@/components/app-sidebar'
import { DashboardBreadcrumb } from '@/components/dashboard-breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAuthToken } from '@/lib/auth-token'
import { prisma } from '@/lib/prisma'
import { getOnboardingStatus } from '@/lib/auth-server'
import Boot from '@/app/boot'
import { NotificationProvider } from '@/app/dashboard/notifications/NotificationProvider'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
  }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) redirect('/auth/login')

  let userId: string
  try {
    userId = verifyAuthToken(token).sub
  } catch {
    redirect('/auth/login')
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, avatarUrl: true },
  })
  if (!user) redirect('/auth/login')

  const onboarding = await getOnboardingStatus(userId)
  if (!onboarding.isComplete) {
    redirect('/onboarding')
  }

  const orgMemberships = await prisma.organizationMembers.findMany({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
  })

  const orgIds = orgMemberships.map((m) => m.organizationId).filter(Boolean) as string[]
  const orgs = orgIds.length
    ? await prisma.organizations.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      })
    : []

  const orgNameById = new Map(orgs.map((o) => [o.id, o.name]))
  const organizations = orgMemberships
    .filter((m) => m.organizationId)
    .map((m) => ({
      id: m.organizationId as string,
      name: orgNameById.get(m.organizationId as string) ?? 'Organization',
      role: m.role ?? 'member',
    }))
  
  return (
    <NotificationProvider>
      <SidebarProvider className='h-svh overflow-hidden'>
        <Boot />
        <AppSidebar user={user} organizations={organizations} />
        <SidebarInset className='min-h-0 overflow-hidden bg-slate-50'>
          <header className='flex h-14 shrink-0 items-center border-b border-slate-200/80 bg-linear-to-r from-white via-white to-sky-50/40 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
            <div className='flex w-full items-center gap-3 px-4'>
              <SidebarTrigger className='size-8 rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm hover:bg-sky-50 hover:text-sky-800' />
              <Separator
                orientation='vertical'
                className='data-[orientation=vertical]:h-5 bg-slate-200'
              />
              <DashboardBreadcrumb />
            </div>
          </header>
          <main className='flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-b from-slate-50 via-slate-50 to-sky-50/30 px-4 py-6'>
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationProvider>
  )
}
