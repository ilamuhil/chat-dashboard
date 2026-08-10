'use client'

import ApiKeyManagementDialog from './ApiKeyManagementDialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { LauncherProps } from './types'
import { PlusIcon } from 'lucide-react'

const ApiKeyLauncher = (props: LauncherProps) => {
  const [open, setOpen] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)

  return (
    <>
      <Button
        type='button'
        className='h-9 shrink-0 gap-1.5 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 px-3 text-xs font-medium shadow-sm hover:from-slate-900 hover:to-sky-900'
        onClick={() => setOpen(true)}>
        <PlusIcon className='size-3.5' />
        Generate API Key
      </Button>
      <ApiKeyManagementDialog
        key={dialogKey}
        open={open}
        onOpenChange={nextOpen => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setDialogKey(key => key + 1)
          }
        }}
        bots={props.bots}
      />
    </>
  )
}

export default ApiKeyLauncher
