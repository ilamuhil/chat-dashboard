import { Skeleton } from '@/components/ui/skeleton'
export default function FollowUpsLoading() {
  return (
    <div role='status' aria-label='Loading follow-ups' className='space-y-5'>
      <div className='space-y-2'>
        <Skeleton className='h-7 w-36' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <div className='flex justify-between border-t border-border pt-5'>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='h-9 w-32' />
      </div>
      <section className='dashboard-surface overflow-hidden rounded-xl'>
        <div className='flex flex-wrap gap-2 border-b border-border p-3'>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className='h-8 w-24' />
          ))}
        </div>
        <div className='flex gap-3 border-b border-border p-3'>
          <Skeleton className='h-9 flex-1' />
          <Skeleton className='h-9 w-40' />
        </div>
        <div className='divide-y divide-border'>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className='space-y-3 p-4'>
              <Skeleton className='h-4 w-52' />
              <Skeleton className='h-3 w-36' />
              <Skeleton className='h-3 w-72 max-w-full' />
            </div>
          ))}
        </div>
      </section>
      <span className='sr-only'>Loading your counsellor worklist</span>
    </div>
  )
}
