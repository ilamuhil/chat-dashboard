'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function NavMain({
  items,
}: {
  items: {
    title: string
    url?: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()

  const isSubItemActive = (subItems?: { url: string }[]) => {
    if (!subItems) return false
    return subItems.some(
      subItem =>
        pathname === subItem.url || pathname.startsWith(subItem.url + '/')
    )
  }

  return (
    <SidebarGroup className='px-1'>
      <SidebarGroupLabel className='px-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
        Platform
      </SidebarGroupLabel>
      <SidebarMenu className='gap-1'>
        {items.map(item => {
          const hasActiveSubItem = isSubItemActive(item.items)
          const isParentActive = pathname === item.url || hasActiveSubItem

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || hasActiveSubItem}
              className='group/collapsible'>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={isParentActive}
                    tooltip={item.title}
                    onClick={() => {
                      if (
                        item?.url &&
                        (!item.items || item.items.length === 0)
                      ) {
                        router.push(item.url)
                      }
                    }}
                    className={cn(
                      'h-9 cursor-pointer rounded-lg px-2.5 text-slate-600 transition-colors',
                      'hover:bg-sky-50 hover:text-slate-900',
                      'data-[active=true]:bg-sky-50 data-[active=true]:font-medium data-[active=true]:text-sky-900 data-[active=true]:shadow-none',
                      'data-[active=true]:ring-1 data-[active=true]:ring-sky-200/70'
                    )}>
                    {item.icon && (
                      <item.icon
                        className={cn(
                          'size-4',
                          isParentActive ? 'text-sky-700' : 'text-slate-500'
                        )}
                      />
                    )}
                    <span>{item.title}</span>
                    {item?.items?.length ? (
                      <ChevronRight className='ml-auto size-4 text-slate-400 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                    ) : null}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {item.items && item.items.length > 0 ? (
                  <CollapsibleContent>
                    <SidebarMenuSub className='ml-3.5 border-l border-slate-200/80 px-1.5'>
                      {item.items.map(subItem => {
                        const isSubActive =
                          pathname === subItem.url ||
                          pathname.startsWith(subItem.url + '/')
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className={cn(
                                'h-8 rounded-md px-2.5 text-slate-600',
                                'hover:bg-sky-50 hover:text-slate-900',
                                'data-[active=true]:bg-sky-50 data-[active=true]:font-medium data-[active=true]:text-sky-900'
                              )}>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
