'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
  useSidebar,
} from '@/components/ui/sidebar'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/core/utils'

type NavigationItem = {
  title: string
  url?: string
  icon?: LucideIcon
  isActive?: boolean
  items?: { title: string; url: string }[]
}

function CollapsedNavGroup({
  item,
  pathname,
  active,
}: {
  item: NavigationItem
  pathname: string
  active: boolean
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const hovered = useRef(false)
  const cancelClose = () => clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpen(false), 180)
  }
  useEffect(() => () => clearTimeout(closeTimer.current), [])
  return (
    <SidebarMenuItem>
      <DropdownMenu
        modal={false}
        open={open}
        onOpenChange={(value) => {
          cancelClose()
          setOpen(value)
        }}
      >
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            aria-label={item.title}
            isActive={active}
            onPointerEnter={(event) => {
              if (event.pointerType === 'touch') return
              hovered.current = true
              cancelClose()
              setOpen(true)
            }}
            onPointerLeave={scheduleClose}
            onPointerDown={event => {
              if (hovered.current && open) event.preventDefault()
            }}
            onKeyDown={() => {
              hovered.current = false
            }}
            className={cn(
              'h-9 cursor-pointer rounded-lg text-slate-600 hover:bg-sky-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-sky-500/15 dark:hover:text-sky-100',
              'data-[active=true]:bg-sky-50 data-[active=true]:text-sky-900 dark:data-[active=true]:bg-sky-500/15 dark:data-[active=true]:text-sky-100',
            )}
          >
            {item.icon && <item.icon className='size-4' />}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side='right'
          align='start'
          sideOffset={8}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          onCloseAutoFocus={(event) => {
            if (hovered.current) event.preventDefault()
          }}
          className='w-60 rounded-xl border-border bg-popover p-1.5 text-popover-foreground shadow-lg'
        >
          <DropdownMenuLabel className='px-2 py-1.5 text-xs text-muted-foreground'>
            {item.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items?.map((child) => {
            const selected =
              pathname === child.url || pathname.startsWith(child.url + '/')
            return (
              <DropdownMenuItem
                key={child.url}
                asChild
                className={cn(
                  'cursor-pointer rounded-lg px-2.5 py-2',
                  selected &&
                    'bg-sky-50 font-medium text-sky-900 dark:bg-sky-500/15 dark:text-sky-100',
                )}
              >
                <Link
                  href={child.url}
                  aria-current={selected ? 'page' : undefined}
                >
                  {child.title}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

export function NavMain({ items }: { items: NavigationItem[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, isMobile } = useSidebar()

  const isSubItemActive = (subItems?: { url: string }[]) => {
    if (!subItems) return false
    return subItems.some(
      (subItem) =>
        pathname === subItem.url || pathname.startsWith(subItem.url + '/'),
    )
  }

  return (
    <SidebarGroup className='px-1'>
      <SidebarGroupLabel className='px-2 text-[11px] font-medium tracking-wide text-slate-400 uppercase'>
        Platform
      </SidebarGroupLabel>
      <SidebarMenu className='gap-1'>
        {items.map((item) => {
          const hasActiveSubItem = isSubItemActive(item.items)
          const isParentActive = pathname === item.url || hasActiveSubItem

          if (state === 'collapsed' && !isMobile && item.items?.length) {
            return (
              <CollapsedNavGroup
                key={item.title}
                item={item}
                pathname={pathname}
                active={isParentActive}
              />
            )
          }

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive || hasActiveSubItem}
              className='group/collapsible'
            >
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
                      'hover:bg-sky-50 hover:text-slate-900 dark:hover:bg-sky-500/15 dark:hover:text-sky-100',
                      'data-[active=true]:bg-sky-50 data-[active=true]:font-medium data-[active=true]:text-sky-900 data-[active=true]:shadow-none',
                      'dark:data-[active=true]:bg-sky-500/15 dark:data-[active=true]:text-sky-100',
                      'data-[active=true]:ring-1 data-[active=true]:ring-sky-200/70 dark:data-[active=true]:ring-sky-400/30',
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={cn(
                          'size-4',
                          isParentActive
                            ? 'text-sky-700 dark:text-sky-300'
                            : 'text-slate-500',
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
                      {item.items.map((subItem) => {
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
                                'hover:bg-sky-50 hover:text-slate-900 dark:hover:bg-sky-500/15 dark:hover:text-sky-100',
                                'data-[active=true]:bg-sky-50 data-[active=true]:font-medium data-[active=true]:text-sky-900',
                                'dark:data-[active=true]:bg-sky-500/15 dark:data-[active=true]:text-sky-100',
                              )}
                            >
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
