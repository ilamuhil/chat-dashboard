'use client'

import React, { useState } from 'react'
import { LinkIcon, FileIcon, TrashIcon, InfoIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusChip, type StatusChipStatus } from '@/components/status-chip'
type Props = {
  resources: Array<{
    id: string
    type: 'url' | 'file'
    value: string
    status: StatusChipStatus
    onDelete: () => void
  }>
  isDisabled: boolean
  loading: boolean
}

const ResourceContainer = (props: Props) => {
  const [openDialog, setOpenDialog] = useState<string | null>(null)

  return (
    <>
      <h2 className='text-center text-sm font-medium mb-4 mt-8'>
        Uploaded Resources and Files
      </h2>
      <Separator />
      {props.loading ? (
        <ResourceLoader />
      ) : props.resources?.length === 0 ? (
        <div className='rounded bg-slate-50 p-4 text-sm text-muted-foreground text-center'>
          No resources added yet!
        </div>
      ) : (
        <div
          className='grid gap-2 bg-slate-50 rounded p-2 w-full justify-start'
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 240px))' }}>
          {props.resources.map(resource => (
            <React.Fragment key={resource.id}>
              <div className='bg-sky-800/10 p-2 flex flex-col gap-1 rounded w-full min-w-0 max-w-sm'>
                <div className='flex items-center justify-between'>
                  <StatusChip status={resource.status} className='rounded p-1' />
                  {resource.status === 'failed' && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setOpenDialog(resource.value)
                      }}
                      className='h-5 w-5 p-0'>
                      <InfoIcon className='size-3 text-red-500' />
                    </Button>
                  )}
                </div>
                <Dialog
                  open={openDialog === resource.value}
                  onOpenChange={(open) => {
                    if (!open) setOpenDialog(null)
                  }}>
                  <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                      <DialogTitle className='text-sm'>Processing Error</DialogTitle>
                      <DialogDescription className='text-xs space-y-2 pt-2'>
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
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <div className='flex items-center gap-1.5 border border-slate-300 rounded px-1.5 py-1 min-w-0'>
                  <div>
                    {resource.type === 'url' ? (
                      <LinkIcon className='size-2.5' />
                    ) : (
                      <FileIcon className='size-2.5' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <small className='text-[0.6rem] text-muted-foreground truncate block'>
                      {resource.value}
                    </small>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={props.isDisabled}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      resource.onDelete()
                    }}
                    className='h-5 w-5 p-0 bg-white hover:bg-gray-100'>
                    <TrashIcon className='size-2.5 text-red-500' />
                  </Button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  )
}


const ResourceLoader = () => {
  return (
    <div
      className='grid gap-2 bg-slate-50 rounded p-2 w-full justify-start'
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 240px))' }}>
      {Array.from({ length: 1 }).map((_, index) => (
        <div
          key={index}
          className='w-full max-w-sm rounded-md border bg-gray-200 h-20 animate-pulse'
        />
      ))}
    </div>
  )
}

export default ResourceContainer
