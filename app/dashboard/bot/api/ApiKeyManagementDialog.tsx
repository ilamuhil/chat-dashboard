'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CopyIcon, KeyRoundIcon, ShieldAlertIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { saveApiKey } from './action'
import type { ApiKeyResult } from './types'
import { useActionState } from 'react'
import { Spinner } from '@/components/ui/spinner'

type Bot = {
  id: string
  name: string
}

type ApiKeyManagementDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bots: Bot[]
}

const ApiKeyManagementDialog = (props: ApiKeyManagementDialogProps) => {
  const [state, action, isPending] = useActionState<ApiKeyResult, FormData>(
    saveApiKey,
    {
      error: null,
      success: null,
      apiKey: null,
      nonce: null,
    }
  )

  const showGeneratedKey = Boolean(state?.apiKey)

  const handleClose = () => {
    props.onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    } else {
      props.onOpenChange(true)
    }
  }

  useEffect(() => {
    if (!state?.nonce) return
    if (state.success) toast.success(state.success)
    if (state.error) toast.error(state.error)
  }, [state?.nonce, state?.success, state?.error])

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md' aria-describedby='api-key-form'>
        <DialogHeader className='space-y-2'>
          <div className='flex size-10 items-center justify-center rounded-lg bg-linear-to-br from-sky-500 to-slate-700 text-white shadow-sm'>
            <KeyRoundIcon className='size-4' />
          </div>
          <DialogTitle className='text-base font-semibold tracking-tight'>
            {showGeneratedKey ? 'API key created' : 'Generate API key'}
          </DialogTitle>
          <DialogDescription className='text-xs leading-relaxed'>
            {showGeneratedKey
              ? 'Copy this key now. For security, it will not be shown again.'
              : 'Create a labeled key tied to one of your bots.'}
          </DialogDescription>
        </DialogHeader>

        <form className='mt-2 space-y-4' action={action} id='api-key-form'>
          {!showGeneratedKey && (
            <>
              <div className='space-y-1.5'>
                <Label
                  htmlFor='api_key_label'
                  className='text-xs font-medium text-muted-foreground'>
                  API key label
                </Label>
                <Input
                  type='text'
                  id='api_key_label'
                  name='api_key_label'
                  placeholder='Ecommerce bot API'
                  required
                  disabled={isPending}
                  className='h-9 border-slate-200 text-sm shadow-sm'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-medium text-muted-foreground'>
                  Bot
                </Label>
                <Select name='bot_id' required disabled={isPending}>
                  <SelectTrigger className='h-9 w-full border-slate-200 text-sm shadow-sm'>
                    <SelectValue placeholder='Select a bot' />
                  </SelectTrigger>
                  <SelectContent>
                    {props.bots.map(bot => (
                      <SelectItem key={bot.id} value={bot.id + ''}>
                        {bot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className='gap-2 sm:gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleClose}
                  disabled={isPending}
                  className='h-9 rounded-lg border-slate-200 text-xs'>
                  Cancel
                </Button>
                <Button
                  type='submit'
                  disabled={isPending}
                  className='h-9 rounded-lg bg-linear-to-r from-slate-800 to-sky-800 text-xs font-medium hover:from-slate-900 hover:to-sky-900'>
                  {isPending ? (
                    <span className='flex items-center gap-2'>
                      Generating… <Spinner />
                    </span>
                  ) : (
                    'Generate API Key'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}

          {showGeneratedKey && state?.apiKey && (
            <>
              <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5'>
                <ShieldAlertIcon className='mt-0.5 size-3.5 shrink-0 text-amber-600' />
                <p className='text-xs leading-relaxed text-amber-800'>
                  Store this key securely. You will not be able to view it again
                  after closing this dialog.
                </p>
              </div>

              <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-1.5 pl-3'>
                <code className='min-w-0 flex-1 truncate font-mono text-xs text-foreground'>
                  {state.apiKey}
                </code>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-8 shrink-0 rounded-md bg-white hover:bg-sky-50'
                  onClick={() => {
                    if (state.apiKey) {
                      navigator.clipboard.writeText(state.apiKey)
                      toast.success('API Key copied to clipboard')
                    }
                  }}>
                  <CopyIcon className='size-3.5 text-slate-500' />
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type='button'
                  onClick={handleClose}
                  className='h-9 w-full rounded-lg bg-linear-to-r from-slate-800 to-sky-800 text-xs font-medium hover:from-slate-900 hover:to-sky-900 sm:w-auto'>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyManagementDialog
