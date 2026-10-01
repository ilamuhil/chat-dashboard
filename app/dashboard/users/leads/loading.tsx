import { Skeleton } from '@/components/ui/skeleton'

export default function LeadsLoading() {
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col'>
      <header className='shrink-0 space-y-2 pb-4'>
        <Skeleton className='h-7 w-28' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </header>
      <div className='border-t border-slate-200 pt-4'>
        <div className='grid gap-3 md:grid-cols-3'>
          {[0, 1, 2].map(item => (
            <div
              key={item}
              className='dashboard-surface flex items-center justify-between rounded-xl p-4'>
              <div className='space-y-2'>
                <Skeleton className='h-3 w-24' />
                <Skeleton className='h-7 w-12' />
              </div>
              <Skeleton className='size-9 rounded-lg' />
            </div>
          ))}
        </div>

        <section className='dashboard-surface mt-6 overflow-hidden rounded-xl'>
          <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
            <Skeleton className='h-9 w-full max-w-md' />
            <Skeleton className='ml-4 h-9 w-24' />
          </div>
          <div className='divide-y divide-slate-100'>
            {[0, 1, 2, 3, 4, 5].map(item => (
              <div key={item} className='flex items-center gap-5 px-5 py-4'>
                <Skeleton className='size-4 rounded' />
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-44' />
                <Skeleton className='h-3 w-28' />
                <Skeleton className='ml-auto h-3 w-24' />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
