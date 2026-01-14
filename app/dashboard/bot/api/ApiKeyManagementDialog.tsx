'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
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

type Bot = {
  id: string
  name: string
}
import { saveApiKey } from './action'
import type { ApiKeyResult } from './types'
import { useActionState } from 'react'

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
  const [apiKeyGenerated, setApiKeyGenerated] = useState(false)
  

  const handleClose = () => {
    setApiKeyGenerated(false)
    props.onOpenChange(false)
  }
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    } else props.onOpenChange(true)
  }
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success)
      if (state.apiKey) {
        setApiKeyGenerated(true)
      }
    }
    if (state?.error) {
      toast.error(state.error)
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.nonce])


  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby='api-key-form'>
        <DialogHeader>
          <DialogTitle>API Key Management</DialogTitle>
        </DialogHeader>
        <form className='space-y-4 mt-6' action={action} id='api-key-form'>
          {!apiKeyGenerated && (
            <>
              <Label
                htmlFor='api_key_label'
                className='text-xs font-medium text-muted-foreground mb-2'>
                Api Key Label*
              </Label>
              <Input
                type='text'
                id='api_key_label'
                name='api_key_label'
                placeholder='Ecommerce bot API'
                required
                disabled={isPending}
              />
              <div className='w-full'>
                <Select
                  name='bot_id'
                  required
                  disabled={isPending}
                >
                  <SelectTrigger className='w-full'>
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
              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleClose}
                  disabled={isPending}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isPending}>
                  {isPending ? 'Generating...' : 'Generate API Key'}
                </Button>
              </DialogFooter>
            </>
          )}
          {apiKeyGenerated && state?.apiKey && (
            <>
              <p className='text-xs text-muted-foreground'>
                Please copy your API Key now. You will not be able to access it
                again.
              </p>
              <code className='text-xs [&_span]:text-muted-foreground bg-gray-100 py-1 pr-1 pl-3 rounded w-full flex items-center justify-between'>
                <span>{state.apiKey}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  className='p-2 text-xs bg-gray-500/10 hover:bg-gray-500/30 rounded'
                  onClick={() => {
                    if (state.apiKey) {
                      navigator.clipboard.writeText(state.apiKey)
                      toast.success('API Key copied to clipboard')
                    }
                  }}>
                  <CopyIcon className=' text-gray-500' />
                </Button>
              </code>
              <DialogFooter>
                <Button type='button' onClick={handleClose}>
                  Close
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
