"use client";

import ApiKeyManagementDialog from './ApiKeyManagementDialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { LauncherProps } from './types'


const ApiKeyLauncher = (props: LauncherProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant='default' className='text-xs px-2' onClick={() => setOpen(true)}>
        Generate API Key
      </Button>
      <ApiKeyManagementDialog open={open} onOpenChange={(open) => setOpen(open)} bots={props.bots} />
    </>
    )
}

export default ApiKeyLauncher