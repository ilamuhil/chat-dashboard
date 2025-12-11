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
import React, { useState, useRef } from 'react'

export function ImageUploadDialog({ open, setOpen }: { open: boolean, setOpen: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDelete = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} >
      <form>
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
              disabled={!preview}>
              <Trash2 className='size-4' />
            </Button>
            <Button type='submit' variant='outline' className='ml-auto'>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
