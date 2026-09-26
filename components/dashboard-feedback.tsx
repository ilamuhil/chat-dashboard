'use client'

import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, MessageSquareMore, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

const MAX_FILES = 8
const MAX_FILE_SIZE = 8 * 1024 * 1024

export default function DashboardFeedback() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isSending, setIsSending] = useState(false)

  const addFiles = (selected: FileList | null) => {
    if (!selected) return

    const incoming = Array.from(selected)
    if (incoming.some(file => !file.type.startsWith('image/'))) {
      toast.error('Only image attachments are supported.')
      return
    }
    if (incoming.some(file => file.size > MAX_FILE_SIZE)) {
      toast.error('Each image must be under 8 MB.')
      return
    }

    setFiles(current => {
      const next = [...current, ...incoming]
      if (next.length > MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} images.`)
        return current
      }
      return next
    })
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      toast.error('Please enter your feedback.')
      return
    }

    setIsSending(true)
    const formData = new FormData()
    formData.set('message', trimmedMessage)
    files.forEach(file => formData.append('files', file))

    try {
      const response = await fetch('/api/dashboard/feedback', {
        method: 'POST',
        body: formData,
      })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error || 'Feedback could not be sent.')

      toast.success('Thanks for your feedback!')
      setMessage('')
      setFiles([])
      setOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Feedback could not be sent. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!isSending) setOpen(nextOpen)
      }}>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-9 cursor-pointer rounded-xl border-slate-200/80 bg-white text-slate-600 shadow-sm hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'>
          <MessageSquareMore className='mr-1.5 size-4' aria-hidden='true' />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className='rounded-2xl border-slate-200 p-6 sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Share your feedback</DialogTitle>
          <DialogDescription>
            Tell us what is working well or what we can improve. You can attach
            screenshots in any image format.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className='space-y-5'>
          <div className='space-y-2'>
            <label
              htmlFor='dashboard-feedback'
              className='text-sm font-medium text-slate-800'>
              Message
            </label>
            <Textarea
              id='dashboard-feedback'
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder='What would you like us to know?'
              rows={8}
              maxLength={10_000}
              disabled={isSending}
              className='min-h-40 resize-none rounded-xl border-slate-200 bg-slate-50/50'
            />
          </div>

          <div className='space-y-3 border-t border-slate-100 pt-4'>
            <input
              ref={inputRef}
              type='file'
              accept='image/*'
              multiple
              className='hidden'
              onChange={event => {
                addFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isSending || files.length >= MAX_FILES}
              className='cursor-pointer rounded-lg border-slate-200 text-xs'
              onClick={() => inputRef.current?.click()}>
              <ImagePlus className='mr-1.5 size-4' aria-hidden='true' />
              Attach images
            </Button>

            {files.length > 0 && (
              <div className='grid gap-2 sm:grid-cols-2'>
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    className='flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs'>
                    <span className='min-w-0 flex-1 truncate text-slate-600'>
                      {file.name}
                    </span>
                    <button
                      type='button'
                      disabled={isSending}
                      aria-label={`Remove ${file.name}`}
                      className='cursor-pointer rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700'
                      onClick={() =>
                        setFiles(current =>
                          current.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }>
                      <X className='size-3.5' aria-hidden='true' />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={isSending}
              className='rounded-lg'
              onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isSending || !message.trim()}
              className='rounded-lg bg-slate-950 hover:bg-sky-700'>
              {isSending && (
                <LoaderCircle className='mr-1.5 size-4 animate-spin' />
              )}
              {isSending ? 'Sending…' : 'Send feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
