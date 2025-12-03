import React from 'react'
import { Spinner } from '@/components/ui/spinner'

const Loading = () => {
  return (
    <div className='flex items-center justify-center h-dvh bg-background'>
      <div className='flex flex-col items-center gap-4'>
        <Spinner className='size-8' />
        <p className='text-sm text-muted-foreground'>Loading dashboard...</p>
      </div>
    </div>
  )
}

export default Loading