'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import { AppLoader } from '@/components/ui/app-loader'

const MINIMUM_LOADER_TIME_MS = 650

function TransitionContent({
  children,
  className,
  showLoader,
}: {
  children: React.ReactNode
  className?: string
  showLoader: boolean
}) {
  const [isWaiting, setIsWaiting] = useState(showLoader)

  useEffect(() => {
    if (!showLoader) return

    const timer = window.setTimeout(
      () => setIsWaiting(false),
      MINIMUM_LOADER_TIME_MS,
    )

    return () => window.clearTimeout(timer)
  }, [showLoader])

  if (isWaiting) {
    return <AppLoader label='Loading your page' />
  }

  return <div className={cn('route-transition', className)}>{children}</div>
}

export function RouteTransition({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const usesConversationLoader = pathname.startsWith(
    '/dashboard/users/conversations',
  )
  const isDocumentationPage = pathname.startsWith('/docs')

  return (
    <TransitionContent
      key={pathname}
      className={className}
      showLoader={!usesConversationLoader && !isDocumentationPage}>
      {children}
    </TransitionContent>
  )
}
