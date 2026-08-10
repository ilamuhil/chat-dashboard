import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type DashboardPageHeaderProps = {
  title: string
  description: string
  children: ReactNode
  /**
   * When true (default), page body scrolls under a fixed header.
   * Set false for layouts that manage their own overflow (e.g. conversations).
   */
  scrollable?: boolean
  className?: string
  contentClassName?: string
}

export function DashboardPageHeader({
  title,
  description,
  children,
  scrollable = true,
  className,
  contentClassName,
}: DashboardPageHeaderProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-1 flex-col', className)}>
      <header className='shrink-0 space-y-1 pb-4'>
        <h1 className='dashboard-title'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </header>
      <Separator className='shrink-0' />
      <div
        className={cn(
          'min-h-0 flex-1 pt-4',
          scrollable
            ? 'overflow-y-auto no-scrollbar'
            : 'flex flex-col overflow-hidden',
          contentClassName
        )}>
        {children}
      </div>
    </div>
  )
}
