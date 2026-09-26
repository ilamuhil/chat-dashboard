import { GraduationCap } from 'lucide-react'

import { cn } from '@/lib/utils'

export function AppLoader({
  label = 'Preparing your workspace',
  fullScreen = false,
}: {
  label?: string
  fullScreen?: boolean
}) {
  return (
    <div
      role='status'
      aria-live='polite'
      className={cn(
        'flex w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.08),transparent_32%)] px-6',
        fullScreen ? 'min-h-dvh' : 'min-h-[55vh] flex-1',
      )}>
      <div className='flex flex-col items-center'>
        <div className='relative grid size-20 place-items-center'>
          <span className='absolute inset-0 rounded-full border border-sky-200/80' />
          <span className='absolute inset-1 animate-[spin_2.4s_linear_infinite] rounded-full border-2 border-transparent border-t-sky-500 border-r-sky-200' />
          <span className='absolute inset-3 animate-[spin_1.8s_linear_infinite_reverse] rounded-full border border-transparent border-b-slate-400' />
          <span className='grid size-11 place-items-center rounded-2xl bg-linear-to-br from-sky-600 to-slate-900 text-white shadow-lg shadow-sky-900/20'>
            <GraduationCap className='size-5' aria-hidden='true' />
          </span>
          <span className='absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.8)]' />
        </div>

        <p className='mt-5 text-sm font-semibold tracking-[-0.01em] text-slate-800'>
          {label}
        </p>
        <p className='mt-1.5 text-xs text-slate-500'>This will only take a moment</p>

        <div className='mt-5 h-1 w-32 overflow-hidden rounded-full bg-slate-200'>
          <div className='loader-progress h-full w-1/2 rounded-full bg-linear-to-r from-sky-500 to-teal-400' />
        </div>
        <span className='sr-only'>Loading</span>
      </div>
    </div>
  )
}
