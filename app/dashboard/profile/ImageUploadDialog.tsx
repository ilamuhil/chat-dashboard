'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CameraIcon, Trash2 } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import {
  uploadOrganizationLogo,
  deleteOrganizationLogo,
  getOrganizationLogoUrl,
} from './action'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

async function uploadImage(
  file: File,
  organizationId: string
): Promise<{ error?: string; success?: string; url?: string }> {
  try {
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File size must be less than 5MB' }
    }
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (
      !fileExtension ||
      !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)
    ) {
      return {
        error: 'Invalid file type. Supported formats: JPG, JPEG, PNG, WEBP',
      }
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('organizationId', organizationId)

    const result = await uploadOrganizationLogo(formData)
    return result
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again later.' }
  }
}

async function getExistingLogoUrl(
  organizationId: string
): Promise<string | null> {
  try {
    return await getOrganizationLogoUrl(organizationId)
  } catch (err) {
    console.error('Error getting existing logo URL:', err)
    return null
  }
}

async function deleteLogo(
  organizationId: string
): Promise<{ error?: string; success?: string }> {
  try {
    return await deleteOrganizationLogo(organizationId)
  } catch (err) {
    console.error('Unexpected error deleting logo:', err)
    return { error: 'An unexpected error occurred. Please try again later.' }
  }
}

export function ImageUploadDialog({
  open,
  setOpen,
  organizationId,
  onUploadSuccess,
  onDeleteSuccess,
}: {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  organizationId: string | null | undefined
  onUploadSuccess?: (url: string) => void
  onDeleteSuccess?: () => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setPreview(null)
      setUploadedUrl(null)
      setSelectedFile(null)
      setIsUploading(false)
      setIsDeleting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  useEffect(() => {
    if (!open || !organizationId) {
      return
    }

    const loadLogo = async () => {
      const url = await getExistingLogoUrl(organizationId)
      if (url) {
        setUploadedUrl(url)
        setPreview(url)
      } else {
        const placeholderUrl = 'https://avatar.iran.liara.run/public'
        setUploadedUrl(null)
        setPreview(placeholderUrl)
      }
    }

    loadLogo()
  }, [open, organizationId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      handleSave(
        new MouseEvent('click') as unknown as React.MouseEvent<
          HTMLButtonElement,
          MouseEvent
        >,
        file as File
      )
    }
  }

  const handleDelete = async () => {
    if (selectedFile) {
      if (uploadedUrl) {
        setPreview(uploadedUrl)
      } else {
        const placeholderUrl = 'https://avatar.iran.liara.run/public'
        setPreview(placeholderUrl)
      }
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (!uploadedUrl || !organizationId) {
      toast.error('No logo to delete')
      return
    }

    setIsDeleting(true)
    const result = await deleteLogo(organizationId)
    setIsDeleting(false)

    if (result.error) {
      toast.error(result.error, { position: 'top-center' })
    } else if (result.success) {
      toast.success(result.success, { position: 'top-center' })
      const placeholderUrl = 'https://avatar.iran.liara.run/public'
      setPreview(placeholderUrl)
      setUploadedUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
    }
  }

  const handleSave = async (
    e: React.MouseEvent<HTMLButtonElement>,
    file: File | null
  ) => {
    e.preventDefault()
    if (!file || !organizationId) {
      toast.error('Please select a file to upload')
      return
    }

    setIsUploading(true)
    const result = await uploadImage(file, organizationId)
    setIsUploading(false)

    if (result.error) {
      toast.error(result.error, { position: 'top-center' })
    } else if (result.success && result.url) {
      toast.success(result.success, { position: 'top-center' })
      setUploadedUrl(result.url)
      setPreview(result.url)

      if (onUploadSuccess) {
        onUploadSuccess(result.url)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='space-y-2'>
          <DialogTitle className='text-base font-semibold tracking-tight'>
            Organization logo
          </DialogTitle>
          <DialogDescription className='text-xs leading-relaxed'>
            Click the image to upload a new logo. JPG, PNG, or WEBP up to 5MB.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-2'>
          <div className='flex justify-center'>
            <button
              type='button'
              className='group relative rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40'
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isDeleting}>
              <Avatar className='size-48 rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 transition-all duration-200 group-hover:shadow-md'>
                <AvatarImage
                  src={preview || undefined}
                  alt='Profile preview'
                  className='object-cover'
                />
                <AvatarFallback
                  className={cn(
                    'rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500'
                  )}>
                  Logo
                </AvatarFallback>
              </Avatar>
              <span className='absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-900/0 transition-colors group-hover:bg-slate-900/40'>
                {isUploading ? (
                  <Spinner className='size-5 text-white' />
                ) : (
                  <>
                    <CameraIcon className='size-5 text-white opacity-0 transition-opacity group-hover:opacity-100' />
                    <span className='text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100'>
                      Upload image
                    </span>
                  </>
                )}
              </span>
            </button>
          </div>

          <div className='hidden'>
            <Label htmlFor='image'>Image</Label>
            <Input
              ref={fileInputRef}
              id='image'
              name='image'
              type='file'
              accept='image/*'
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter className='flex-row justify-between sm:justify-between'>
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-9 rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700'
            onClick={handleDelete}
            disabled={
              (!selectedFile && !uploadedUrl) ||
              isDeleting ||
              isUploading ||
              !organizationId
            }
            title={
              isUploading
                ? 'Cannot delete while uploading'
                : !selectedFile && !uploadedUrl
                  ? 'Select a file or upload a logo first'
                  : 'Delete logo'
            }>
            {isDeleting ? <Spinner className='size-4' /> : <Trash2 className='size-4' />}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
            className='h-9 rounded-lg border-slate-200 text-xs'>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
