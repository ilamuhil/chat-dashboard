import Link from 'next/link'
import { ArrowLeftIcon, CompassIcon } from 'lucide-react'

export default function NotFound() {
  return (
    <main className='flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-16'>
      <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <div className='mx-auto flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100'>
          <CompassIcon className='size-6' aria-hidden='true' />
        </div>
        <p className='mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400'>
          404
        </p>
        <h1 className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
          This page could not be found
        </h1>
        <p className='mt-2 text-sm leading-6 text-slate-500'>
          The link may be outdated or the page may have moved.
        </p>
        <Link
          href='/'
          className='mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700'>
          <ArrowLeftIcon className='size-4' aria-hidden='true' />
          Back to home
        </Link>
      </div>
    </main>
  )
}
