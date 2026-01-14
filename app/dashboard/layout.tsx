import { AppSidebar } from '@/components/app-sidebar'
import { DashboardBreadcrumb } from '@/components/dashboard-breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import React from 'react'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
  }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }
  
  // Fetch user profile to get full_name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: orgMemberships, error: orgMembershipsError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)

  if (orgMembershipsError) {
    console.error(
      'Error fetching organization memberships:',
      orgMembershipsError
    )
  }

  const orgIds = orgMemberships?.map(m => m.organization_id) ?? []
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds)

  if (orgsError) {
    console.error('Error fetching organizations:', orgsError)
  }

  const orgNameById = new Map((orgs ?? []).map(o => [o.id, o.name]))

  const organizations =
    orgMemberships?.map(m => ({
      id: m.organization_id,
      name: orgNameById.get(m.organization_id) ?? 'Organization',
      role: m.role ?? 'member',
    })) ?? []
  
  return (
    <SidebarProvider className='h-svh overflow-hidden'>
      <AppSidebar user={user} profile={profile} organizations={organizations} />
      <SidebarInset className='min-h-0 overflow-hidden'>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4'
            />
            <DashboardBreadcrumb />
          </div>
        </header>
        <main className='flex flex-1 flex-col gap-4 px-4 py-6 bg-gray-100 min-h-0 overflow-y-auto'>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
