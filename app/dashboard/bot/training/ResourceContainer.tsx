'use client'

import React, { useState } from 'react'
import {
  LinkIcon,
  FileIcon,
  TrashIcon,
  InfoIcon,
  FolderOpenIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StatusChip, type StatusChipStatus } from '@/components/status-chip'
import { cn } from '@/lib/utils'

type Props = {
  resources: Array<{
    id: string
    type: 'url' | 'file'
    value: string
    status: StatusChipStatus | string | null | undefined
    onDelete: () => void
  }>
  isDisabled: boolean
  loading: boolean
}

const isFailedStatus = (status: string | null | undefined) =>
  status === 'failed' ||
  status === 'training_failed' ||
  status === 'processing_failed' ||
  status === 'upload_failed'

const ResourceContainer = (props: Props) => {
  const [openDialog, setOpenDialog] = useState<string | null>(null)

  return (
    <section className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold tracking-tight text-foreground'>
            Training resources
          </h2>
          <p className='text-xs text-muted-foreground'>
            URLs and files queued for this bot
          </p>
        </div>
        {!props.loading && props.resources.length > 0 && (
          <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'>
            {props.resources.length}
          </span>
        )}
      </div>

      {props.loading ? (
        <ResourceLoader />
      ) : props.resources?.length === 0 ? (
        <div className='dashboard-surface flex flex-col items-center justify-center gap-2 rounded-xl border-dashed px-4 py-10 text-center'>
          <div className='flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400'>
            <FolderOpenIcon className='size-5' />
          </div>
          <p className='text-sm font-medium text-foreground'>No resources yet</p>
          <p className='max-w-xs text-xs text-muted-foreground'>
            Add a URL or upload files above to start building your training set.
          </p>
        </div>
      ) : (
        <div className='dashboard-surface divide-y divide-slate-100 overflow-hidden rounded-xl'>
          {props.resources.map(resource => (
            <div
              key={resource.id}
              className='group flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-sky-50/40'>
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1',
                  resource.type === 'url'
                    ? 'bg-sky-50 text-sky-700 ring-sky-200/70'
                    : 'bg-slate-50 text-slate-600 ring-slate-200/70'
                )}>
                {resource.type === 'url' ? (
                  <LinkIcon className='size-3.5' />
                ) : (
                  <FileIcon className='size-3.5' />
                )}
              </div>

              <div className='min-w-0 flex-1'>
                <div className='flex min-w-0 items-center gap-2'>
                  <p className='min-w-0 truncate text-xs font-semibold text-foreground'>
                    {resource.value}
                  </p>
                  <span className='shrink-0'>
                    <StatusChip status={resource.status} />
                  </span>
                </div>
                <p className='mt-0.5 text-[11px] capitalize text-muted-foreground'>
                  {resource.type === 'url' ? 'Website URL' : 'Document file'}
                </p>
              </div>

              <div className='flex shrink-0 items-center gap-0.5'>
                {isFailedStatus(resource.status) && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setOpenDialog(resource.value)
                    }}
                    className='size-7 rounded-md text-rose-500 hover:bg-rose-50 hover:text-rose-600'>
                    <InfoIcon className='size-3.5' />
                  </Button>
                )}
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={props.isDisabled}
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    resource.onDelete()
                  }}
                  className='size-7 rounded-md text-slate-400 opacity-70 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600'>
                  <TrashIcon className='size-3.5' />
                </Button>
              </div>

              <Dialog
                open={openDialog === resource.value}
                onOpenChange={open => {
                  if (!open) setOpenDialog(null)
                }}>
                <DialogContent className='sm:max-w-md'>
                  <DialogHeader>
                    <DialogTitle className='text-sm'>Processing Error</DialogTitle>
                    <DialogDescription asChild>
                      <div className='space-y-2 pt-2 text-xs'>
                        <p>
                          Something went wrong while processing this resource.
                          Please try again or contact support if the issue
                          persists.
                        </p>
                        <p>
                          This may be due to an unsupported file type, network
                          error, or service interruption. You can also remove
                          this resource and attempt to upload it again.
                        </p>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const ResourceLoader = () => {
  return (
    <div className='dashboard-surface divide-y divide-slate-100 overflow-hidden rounded-xl'>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className='flex items-center gap-3 px-3 py-2.5'>
          <div className='size-8 animate-pulse rounded-lg bg-slate-200/80' />
          <div className='min-w-0 flex-1 space-y-1.5'>
            <div className='h-3 w-2/3 animate-pulse rounded bg-slate-200/80' />
            <div className='h-2.5 w-1/4 animate-pulse rounded bg-slate-100' />
          </div>
          <div className='h-5 w-16 animate-pulse rounded-full bg-slate-200/70' />
        </div>
      ))}
    </div>
  )
}

export default ResourceContainer
