import React from 'react'
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

type ApiKeyManagementDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ApiKeyManagementDialog = (props: ApiKeyManagementDialogProps) => {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Key Management</DialogTitle>
        </DialogHeader>
        <main className='space-y-4 mt-6'>
          <p className='text-xs text-muted-foreground'>
            Please copy your API Key now. You will not be able to access it
            again.
          </p>
          <code className='text-xs [&_span]:text-muted-foreground bg-gray-100 py-1 pr-1 pl-3 rounded w-full flex items-center justify-between'>
            <span>chat_dlkjfsd-sdfklije-fjkn-lkjfsdf </span>
            <Button
              variant='icon'
              size='icon-xs'
              className='p-2 text-xs bg-gray-500/10 hover:bg-gray-500/30 rounded'
              onClick={() => {
                navigator.clipboard.writeText(
                  'chat_dlkjfsd-sdfklije-fjkn-lkjfsdf'
                )
                toast.success('API Key copied to clipboard')
              }}>
              <CopyIcon className=' text-gray-500' />
            </Button>
          </code>
        </main>
        <DialogFooter>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApiKeyManagementDialog
