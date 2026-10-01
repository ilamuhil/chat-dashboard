import { Skeleton } from '@/components/ui/skeleton'

function DetailCard({
  rows = 4,
  className = '',
}: {
  rows?: number
  className?: string
}) {
  return (
    <section
      className={`dashboard-surface overflow-hidden rounded-xl ${className}`}>
      <div className='flex items-center gap-3 border-b border-slate-100 px-5 py-4'>
        <Skeleton className='size-9 rounded-lg' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-3 w-48' />
        </div>
      </div>
      <div className='grid gap-5 p-5 sm:grid-cols-2'>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className='space-y-2'>
            <Skeleton className='h-2.5 w-20' />
            <Skeleton className='h-4 w-32' />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function LeadDetailLoading() {
  return (
    <div className='flex h-full min-h-0 flex-1 flex-col'>
      <header className='shrink-0 space-y-2 pb-4'>
        <Skeleton className='h-7 w-48' />
        <Skeleton className='h-4 w-96 max-w-full' />
      </header>
      <div className='space-y-5 overflow-y-auto border-t border-slate-200 pt-4 no-scrollbar'>
        <Skeleton className='h-9 w-24' />
        <div className='rounded-2xl border border-sky-100 bg-white p-6'>
          <div className='flex items-start gap-4'>
            <Skeleton className='size-12 rounded-xl' />
            <div className='flex-1 space-y-3'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-4 w-72 max-w-full' />
              <Skeleton className='h-3 w-56 max-w-full' />
            </div>
          </div>
        </div>
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]'>
          <div className='space-y-5'>
            <div className='grid gap-5 md:grid-cols-2'>
              <DetailCard />
              <DetailCard />
            </div>
            <DetailCard rows={5} />
            <DetailCard rows={4} />
          </div>
          <DetailCard rows={8} />
        </div>
      </div>
    </div>
  )
}
