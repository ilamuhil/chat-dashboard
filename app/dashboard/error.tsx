'use client'

import { AlertTriangleIcon, LayoutDashboardIcon, RefreshCwIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] Failed to render dashboard section:', error)
  }, [error])

  return (
    <div className='dashboard-surface flex min-h-80 flex-1 items-center justify-center rounded-2xl p-6'>
      <div className='max-w-md text-center'>
        <div className='mx-auto flex size-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300'>
          <AlertTriangleIcon className='size-5' />
        </div>
        <h1 className='mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
          We couldn&apos;t load this section
        </h1>
        <p className='mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400'>
          A required service may be temporarily unavailable. Your data is safe.
          Try again in a moment.
        </p>
        <div className='mt-6 flex flex-col justify-center gap-2 sm:flex-row'>
          <Button
            type='button'
            onClick={reset}
            className='rounded-xl bg-slate-950 dark:bg-sky-600'>
            <RefreshCwIcon className='size-4' />
            Try again
          </Button>
          <Button asChild variant='outline' className='rounded-xl'>
            <Link href='/dashboard/overview'>
              <LayoutDashboardIcon className='size-4' />
              Back to overview
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
