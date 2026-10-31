'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
export default function FollowUpsError({ reset }: { reset: () => void }) {
  const router = useRouter()
  const [retrying, startTransition] = useTransition()
  return (
    <div
      role='alert'
      className='rounded-xl border border-border bg-card p-8 text-center'>
      <h2 className='text-base font-semibold'>Could not load follow-ups</h2>
      <p className='mt-2 text-sm text-muted-foreground'>
        Your saved activities are safe. Try loading the worklist again.
      </p>
      <Button
        className='mt-4'
        disabled={retrying}
        onClick={() =>
          startTransition(() => {
            router.refresh()
            reset()
          })
        }>
        {retrying ? 'Loading worklist…' : 'Try again'}
      </Button>
    </div>
  )
}
