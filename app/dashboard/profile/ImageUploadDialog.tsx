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
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

const BUCKET = 'org-assets'
const getFilePath = (organizationId: string,fileName:string) => `organizations/${organizationId}/${fileName}`

async function uploadImage(file: File,organizationId:string): Promise<{ error?: string, success?: string, url?: string }> {
  try {
    const supabase = createClient()
    
    if (file.size > 1 * 1024 * 1024) {
      return { error: 'File size must be less than 1MB' }
    }
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !['jpg','jpeg','png','webp'].includes(fileExtension)) {
      return { error: 'Invalid file type. Supported formats: JPG, JPEG, PNG, WEBP' }
    }
    const filePath = getFilePath(organizationId, `logo.${fileExtension}`)
    
    // Delete all old logo files first to avoid conflicts
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    const filesToDelete: string[] = []
    for (const ext of extensions) {
      if (ext !== fileExtension) {
        const oldFilePath = getFilePath(organizationId, `logo.${ext}`)
        filesToDelete.push(oldFilePath)
      }
    }
    if (filesToDelete.length > 0) {
      await supabase.storage.from(BUCKET).remove(filesToDelete)
      // Don't check for errors - it's okay if old files don't exist
    }
    
    // Upload the new file
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, { upsert: true })
    if (error) {
      console.error('Upload error details:', error)
      // Return generic error message for internal Supabase errors
      return { error: 'Failed to upload image. Please try again later.' }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
    return { success: 'Image uploaded successfully', url: urlData.publicUrl }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again later.' }
  }
}

async function getExistingLogoUrl(organizationId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    // Try common image extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    for (const ext of extensions) {
      const fileName = `logo.${ext}`;
      const filePath = getFilePath(organizationId, fileName);
      // Check if file exists by listing files in the directory
      const { data: files, error } = await supabase.storage.from(BUCKET).list(`organizations/${organizationId}`);
      if (error) {
        // If it's a bucket not found error, log it but continue
        if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
          console.warn(`Bucket "${BUCKET}" access error:`, error.message)
        }
        continue
      }
      if (files) {
        const fileExists = files.some(file => file.name === fileName);
        if (fileExists) {
          const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
          return data.publicUrl;
        }
      }
    }
    return null;
  } catch (err) {
    console.error('Error getting existing logo URL:', err)
    return null
  }
}

async function deleteLogo(organizationId: string): Promise<{ error?: string, success?: string }> {
  try {
    const supabase = createClient()
    
    // Try to delete all possible logo file extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    let deletedCount = 0;

    for (const ext of extensions) {
      const fileName = `logo.${ext}`;
      const filePath = getFilePath(organizationId, fileName);
      
      const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
      if (!error) {
        deletedCount++;
      } else {
        // Log error but continue trying other extensions
        console.error(`Error deleting ${fileName}:`, error)
      }
    }

    if (deletedCount > 0) {
      return { success: 'Logo deleted successfully' };
    } else {
      // Return generic error message
      return { error: 'Failed to delete logo. Please try again later.' };
    }
  } catch (err) {
    console.error('Unexpected error deleting logo:', err)
    return { error: 'An unexpected error occurred. Please try again later.' }
  }
}

// Export function to get logo URL (for use in ProfileForm)
export async function getLogoUrl(organizationId: string): Promise<string | null> {
  return getExistingLogoUrl(organizationId)
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
        // Add cache-busting parameter to ensure fresh image
        const cacheBustUrl = `${url}?t=${Date.now()}`
        setUploadedUrl(url)
        setPreview(cacheBustUrl)
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
      // Add cache-busting parameter to force image refresh
      const timestamp = Date.now()
      const cacheBustUrl = `${result.url}?t=${timestamp}`
      
      // Update state with the new URL immediately
      setUploadedUrl(result.url)
      setPreview(cacheBustUrl)
      
      // Notify parent component with the new logo URL (with cache-busting for immediate update)
      if (onUploadSuccess) {
        onUploadSuccess(cacheBustUrl)
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
            disabled={(!selectedFile && !uploadedUrl) || isDeleting || isUploading || !organizationId}>
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
