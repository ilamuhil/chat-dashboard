'use client';

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Trash2 } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { uploadOrganizationLogo, deleteOrganizationLogo, getOrganizationLogoUrl } from './action'

async function uploadImage(file: File, organizationId: string): Promise<{ error?: string; success?: string; url?: string }> {
  try {
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File size must be less than 5MB' }
    }
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
      return { error: 'Invalid file type. Supported formats: JPG, JPEG, PNG, WEBP' }
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

async function getExistingLogoUrl(organizationId: string): Promise<string | null> {
  try {
    return await getOrganizationLogoUrl(organizationId)
  } catch (err) {
    console.error('Error getting existing logo URL:', err)
    return null
  }
}

async function deleteLogo(organizationId: string): Promise<{ error?: string; success?: string }> {
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
  onDeleteSuccess
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
      // Reset state when dialog closes
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

  // Load existing logo URL when dialog opens
  useEffect(() => {
    if (!open || !organizationId) {
      return
    }

    // Load logo URL when dialog opens - always fetch from storage
    const loadLogo = async () => {
      const url = await getExistingLogoUrl(organizationId)
      if (url) {
        // Presigned URLs are already time-limited and unique, so use them directly
        // Adding cache-busting would break the signature
        setUploadedUrl(url)
        setPreview(url)
      } else {
        // Show human profile placeholder image if no logo found
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
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDelete = async () => {
    // If there's a selected file (not yet uploaded), just clear the selection
    if (selectedFile) {
      // Show placeholder or uploaded URL
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

    // If there's an uploaded logo, delete it from storage
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
      // Show human profile placeholder image after deletion
      const placeholderUrl = 'https://avatar.iran.liara.run/public'
      setPreview(placeholderUrl)
      setUploadedUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      // Notify parent component of successful deletion
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
    }
  }

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!selectedFile || !organizationId) {
      toast.error('Please select a file to upload')
      return
    }

    setIsUploading(true)
    const result = await uploadImage(selectedFile, organizationId)
    setIsUploading(false)

    if (result.error) {
      toast.error(result.error, { position: 'top-center' })
    } else if (result.success && result.url) {
      toast.success(result.success, { position: 'top-center' })
      setSelectedFile(null)
      
      // Use the upload result URL directly (this is the new file)
      // Presigned URLs are already time-limited and unique, so use them directly
      setUploadedUrl(result.url)
      setPreview(result.url)
      
      // Notify parent component with the new logo URL
      if (onUploadSuccess) {
        onUploadSuccess(result.url)
      }
      
      // Close dialog after successful upload
      setTimeout(() => {
        setOpen(false)
      }, 1000)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} >
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='text-center'>Upload Profile Image</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='flex justify-center my-4'>
            <Avatar className='size-32 shadow-md border-3 border-sky-600'>
              <AvatarImage src={preview || undefined} alt='Profile preview' />
              <AvatarFallback>Logo</AvatarFallback>
            </Avatar>
          </div>
          <div className='grid gap-3'>
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
        <DialogFooter>
          <Button
            type='button'
            variant='destructive'
            size='icon'
            onClick={handleDelete}
            disabled={(!selectedFile && !uploadedUrl) || isDeleting || isUploading || !organizationId}
            title={
              isUploading 
                ? 'Cannot delete while uploading' 
                : !selectedFile && !uploadedUrl 
                  ? 'Select a file or upload a logo first' 
                  : 'Delete logo'
            }>
            <Trash2 className='size-4' />
          </Button>
          <Button 
            variant='outline' 
            className='ml-auto' 
            onClick={handleSave}
            disabled={!selectedFile || isUploading || isDeleting || !organizationId}
          >
            {isUploading ? 'Uploading...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
