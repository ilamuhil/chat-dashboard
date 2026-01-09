'use client'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeftIcon, CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'
import ResourceContainer from './ResourceContainer'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Bot } from '../interactions/action'
import BotSelectionGrid from './BotSelectionGrid'


type Props = {
  bots: Bot[]
}
export default function TrainingDataClient({ bots }: Props) {
  const [trainingProgress] = useState(45) // Dummy value
  // Dummy values for training stats
  const [totalFilesUploaded] = useState(10)
  const [totalFilesProcessed] = useState(8)
  const [failedFiles] = useState(2)
  const [lastTrainedAt] = useState('12/08/2025 14:30')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)

  if (!selectedBot) {
    return <BotSelectionGrid bots={bots} onSelectBot={setSelectedBot} />
  }

  return (
    <form className='space-y-4'>
      <div className="flex items-end gap-2">
        <Button
          variant="outline"
          type="button"
          size="default"
          className="h-8 px-2 flex items-center gap-1 font-normal text-xs rounded mr-2"
          onClick={() => setSelectedBot(null)}
        >
          <ArrowLeftIcon className="size-4 mr-1" />
          Back to Bot Selection
        </Button>
        <section className="space-y-1 flex-1">
          <Label className="text-xs font-medium text-muted-foreground">
            Enter Url
          </Label>
          <div className="flex w-full items-end">
            <Input
              type="text"
              placeholder="https://example.com"
              className="h-8 text-[0.9em] placeholder:text-xs w-full min-w-[180px] max-w-[330px] rounded-r-none border-r-0"
              style={{ fontSize: "0.65em" }}
            />
            <Button
              variant="outline"
              size="default"
              className="h-8 px-3 text-xl flex items-center rounded-l-none border-l-0"
            >
              +
            </Button>
          </div>
        </section>
      </div>
      <section className='space-y-4'>
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
        <ResourceContainer
          resources={[
            {
              type: 'url',
              value: 'https://example.com',
              status: 'pending',
              onDelete: async () => {},
            },
            {
              type: 'file',
              value: 'example.pdf',
              status: 'processing',
              onDelete: async () => {},
            },
            {
              type: 'url',
              value: 'https://another.com',
              status: 'completed',
              onDelete: async () => {},
            },
            {
              type: 'file',
              value: 'notes.docx',
              status: 'failed',
              onDelete: async () => {},
            },
            {
              type: 'url',
              value: 'https://somesite.com',
              status: 'processing',
              onDelete: async () => {},
            },
            {
              type: 'file',
              value: 'presentation.pptx',
              status: 'completed',
              onDelete: async () => {},
            },
          ]}
          isDisabled={true}
        />
        <Separator />
        <div className='flex items-center gap-2'>
          <Checkbox id='terms-and-conditions' />
          <Label
            htmlFor='terms-and-conditions'
            className='text-xs font-medium text-muted-foreground'>
            I agree to the terms and conditions and privacy policy of the data
            submitted.
          </Label>
        </div>
        <div className='w-full md:w-1/2 rounded-sm border border-gray-200 bg-white p-2'>
          <div className='mb-1.5'>
            <h3 className='text-sm font-medium'>
              Training Progress
            </h3>
          </div>
          <div className='space-y-2'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-[0.65em] text-muted-foreground'>Completed</span>
                <span className='text-[0.65em] font-medium text-foreground'>{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className='h-1.5 rounded-sm' />
            </div>
            <div className='pt-1.5 border-t space-y-1.5'>
              <div className='grid grid-cols-2 gap-x-3 gap-y-1.5'>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>Total Files Uploaded</span>
                  <span className='text-[0.65em] font-semibold text-foreground leading-tight'>{totalFilesUploaded}</span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>Total Files Successfully Processed</span>
                  <span className='text-[0.65em] font-semibold leading-tight text-emerald-600'>{totalFilesProcessed}</span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>Failed Files</span>
                  <span className='text-[0.65em] font-semibold text-rose-600 leading-tight'>{failedFiles}</span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>Last Trained At</span>
                  <span className='text-[0.65em] font-semibold text-foreground leading-tight'>{lastTrainedAt}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button>Confirm and Start Training</Button>
      </section>
    </form>
  )
}
