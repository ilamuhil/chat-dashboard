'use client'

import ApiKeyManagementDialog from './ApiKeyManagementDialog'
import { Button } from '@/components/ui/button'
import { dashboardButtonClass } from '@/lib/dashboard-buttons'
import { cn } from '@/lib/utils'
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
        className={cn(
          dashboardButtonClass,
          'h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-medium',
        )}
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
