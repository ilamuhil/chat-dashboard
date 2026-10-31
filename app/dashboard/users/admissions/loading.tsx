import { Skeleton } from '@/components/ui/skeleton'
export default function Loading() {
  return (
    <div
      role='status'
      aria-label='Loading admissions analytics'
      className='space-y-5 p-4 sm:p-6'>
      <Skeleton className='h-8 w-60' />
      <Skeleton className='h-24 w-full rounded-xl' />
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6'>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className='h-24 rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-80 w-full rounded-xl' />
    </div>
  )
}
