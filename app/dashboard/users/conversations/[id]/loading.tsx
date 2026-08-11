import { LoaderCircleIcon, MessageSquareIcon } from 'lucide-react'

export default function ConversationLoading() {
  return (
    <section className='dashboard-surface flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-linear-to-b from-slate-50/90 via-white to-sky-50/30'>
      <header className='flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3'>
        <div className='flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
          <MessageSquareIcon className='size-3.5' />
        </div>
        <div>
          <h2 className='text-sm font-semibold tracking-tight text-foreground'>
            Conversation
          </h2>
          <p className='text-xs text-muted-foreground'>Loading messages...</p>
        </div>
      </header>

      <div className='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden'>
        <div className='absolute inset-x-8 top-8 space-y-3 opacity-60'>
          <div className='flex animate-pulse items-end gap-2'>
            <div className='size-7 rounded-lg bg-slate-200/80' />
            <div className='h-10 w-2/5 rounded-2xl rounded-bl-md bg-white/90 shadow-sm ring-1 ring-slate-200/60' />
          </div>
          <div className='flex animate-pulse justify-end'>
            <div className='h-12 w-1/2 rounded-2xl rounded-br-md bg-sky-200/70' />
          </div>
          <div className='flex animate-pulse items-end gap-2'>
            <div className='size-7 rounded-lg bg-slate-200/80' />
            <div className='h-8 w-1/3 rounded-2xl rounded-bl-md bg-white/90 shadow-sm ring-1 ring-slate-200/60' />
          </div>
        </div>

        <div className='relative flex flex-col items-center gap-3 text-muted-foreground'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-200/70'>
            <LoaderCircleIcon className='size-6 animate-spin text-sky-600' />
          </div>
          <div className='text-center'>
            <p className='text-sm font-medium text-foreground'>
              Loading conversation
            </p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Getting the latest messages ready
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
