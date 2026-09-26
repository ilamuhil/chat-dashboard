import Link from 'next/link'
import { ArrowLeftIcon, MessageSquareWarningIcon } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <section className='flex min-h-full flex-1 items-center justify-center px-6 py-16'>
      <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <div className='mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100'>
          <MessageSquareWarningIcon className='size-6' aria-hidden='true' />
        </div>
        <p className='mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400'>
          Page not found
        </p>
        <h1 className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
          We couldn&apos;t find that dashboard page
        </h1>
        <p className='mt-2 text-sm leading-6 text-slate-500'>
          The conversation may have been removed or you may no longer have
          access to it.
        </p>
        <Link
          href='/dashboard/users/conversations'
          className='mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700'>
          <ArrowLeftIcon className='size-4' aria-hidden='true' />
          Back to conversations
        </Link>
      </div>
    </section>
  )
}
