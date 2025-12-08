'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CloudUpload } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function BotTrainingPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='dashboard-title'>Training Data</h1>
      </div>
      <div className='space-y-4'>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground '>
            Enter Url
          </Label>
          <Input
            type='text'
            placeholder='https://example.com'
            className='text-xs placeholder:text-xs'
          />
        </div>
        <Button variant='outline' size='default'>
          Add URL
        </Button>
        <div className='alert-muted'>No Urls added yet</div>
        <div className='space-y-4'>
          <Label className='text-xs font-medium text-muted-foreground '>
            Upload Files
          </Label>
          <Input
            id='file-input'
            type='file'
            multiple
            className='text-xs placeholder:text-xs hidden'
          />
          <div
            className={cn('alert-muted cursor-pointer', 'py-6')}
            htmlFor='file-input'
            onClick={() => document.getElementById('file-input')?.click()}>
            <CloudUpload className='size-6 my-3 mx-auto ' />
            <p className='mb-1'>
              Click to upload files or drag and drop files here
            </p>
            <p className='mb-1'>
              Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
            </p>
            <p>Max file size: 10MB</p>
            <p className='italic mt-2 text-amber-600 mb-4'>
              No files uploaded yet
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox id='terms-and-conditions' />
            <Label
              htmlFor='terms-and-conditions'
              className='text-xs font-medium text-muted-foreground'>
              I agree to the terms and conditions and privacy policy of the data
              submitted.
            </Label>
          </div>
          <Card className='w-full md:w-1/2 rounded-md shadow-xs border gap-2'>
            <CardHeader className='pb-2 px-4'>
              <CardTitle className='text-sm font-medium'>
                Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2.5 px-4 pb-3'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground'>Status:</span>
                <Badge
                  variant='outline'
                  className='ring-2 ring-amber-400 text-amber-400 border-0 text-xs px-1.5 py-0.5'>
                  <span className='inline-flex size-1 animate-ping rounded-full bg-amber-400 mr-1'></span>
                  Processing
                </Badge>
              </div>
              <div className='space-y-1 pt-1.5 border-t'>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>
                    Total Files Uploaded
                  </span>
                  <span className='font-medium text-foreground'>10</span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-muted-foreground'>Last Updated</span>
                  <span className='font-medium text-foreground'>
                    12/08/2025
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button>Confirm and Start Training</Button>
        </div>
      </div>
    </div>
  )
}
