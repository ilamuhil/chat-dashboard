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
import { useQuery, useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import { toast } from 'sonner'

type TrainingSourceStatus = 'pending' | 'processing' | 'completed' | 'failed'
type TrainingSourceType = 'url' | 'file'

type TrainingSource = {
  id: string
  type: TrainingSourceType
  value: string
  status: TrainingSourceStatus
  onDelete: () => Promise<void>
}

type ApiTrainingSource = {
  id: string
  type: TrainingSourceType
  source_value: string | null
  status: TrainingSourceStatus
  file?: {
    original_filename?: string | null
    path?: string | null
  } | null
}

type Props = {
  bots: Bot[]
}
export default function TrainingDataClient({ bots }: Props) {
  const [progress] = useState(45) // Dummy value
  // Dummy values for training stats
  const [totalFilesUploaded] = useState(10)
  const [totalFilesProcessed] = useState(8)
  const [failedFiles] = useState(2)
  const [lastTrainedAt] = useState('12/08/2025 14:30')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [filesInfo, setFilesInfo] = useState<
    Array<{
      original_filename: string
      size_bytes: number
      mime_type: string
      file: File
    }>
  >([])
  const [sources, setSources] = useState<TrainingSource[]>([])
  const [url, setUrl] = useState('')
  //query to fetch training sources for the selected bot if training has been completed previously
  const { data: trainingSources, isLoading: isLoadingTrainingSources } =
    useQuery({
      queryKey: ['training-sources', selectedBot?.id],
      queryFn: async () => {
        if (!selectedBot?.id) return []
        const response = await fetch(`/api/training/${selectedBot.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch training sources')
        }
        const { sources: apiSources } = (await response.json()) as {
          sources: ApiTrainingSource[]
        }
        setSources(
          apiSources.map(source => {
            const status = (source.status ?? 'pending') as TrainingSourceStatus
            if (source.type === 'file') {
              return {
                id: source.id,
                type: source.type,
                value:
                  source.file?.original_filename ||
                  source.source_value ||
                  'file',
                status,
                onDelete: async () => deleteTrainingSource(source.id),
              }
            }
            return {
              id: source.id,
              type: source.type,
              value: source.source_value || '',
              status,
              onDelete: async () => deleteTrainingSource(source.id),
            }
          })
        )
        return apiSources
      },
      enabled: !!selectedBot?.id,
    })

  // query to queue training for the selected bot with the uploaded training sources and urls
  const { isPending: isPendingTraining, mutate: train_bot } = useMutation({
    mutationFn: async () => {
      if (!selectedBot?.id) throw new Error('Please select a bot to train')
      const formData = new FormData()
      formData.append(
        'sources',
        JSON.stringify(sources.map(s => ({ type: s.type, value: s.value })))
      )
      for (const fileInfo of filesInfo) {
        const { file } = fileInfo
        formData.append('files', file)
      }
      formData.append(
        'files_meta',
        JSON.stringify(
          filesInfo.map(f => ({
            original_filename: f.original_filename,
            size_bytes: f.size_bytes,
            mime_type: f.mime_type,
          }))
        )
      )
      const response = await fetch(`/api/training/${selectedBot.id}`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const { message } = await response.json()
      return message
    },
    onSuccess: (message: string) => {
      toast.success(message)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to train bot. Please try again.')
    },
  })

  //!NOTE: All deletion should be done in server side.
  /**  Below is the query to delete training sources for the selected bot
  2 types of deletions are happening here depending on the status of the training source:
  1. if training source has been trained on before (i.e it has a state of success or failed) then we need to delete the training source, the embeddings, and the document chunks from the database (either soft or hard delete) and remove files from the storage if source type is file
  2. if the training source has not been trained on before (either no status or status is pending) then (a) if source is url then remove from sources state and (b) if source is file then remove from sources state and remove file from storage
  **/

  const { isPending: isSourceDeletionLoading, mutate: deleteTrainingSource } =
    useMutation({
      mutationFn: async (training_source_id: string) => {
        if (!training_source_id) {
          toast.error('Invalid training source selected for deletion')
          return ''
        }
        const source = sources.find(source => source.id === training_source_id)
        if (!source) {
          toast.error('Invalid training source selected for deletion')
          return ''
        }
        if (source.status === 'pending') {
          setSources(prev =>
            prev.filter(source => source.id !== training_source_id)
          )
          toast.success('Training source deleted successfully')
          return 'Training source deleted successfully'
        } else {
          if (!selectedBot?.id) throw new Error('No bot selected')
          const response = await fetch(`/api/training/${selectedBot.id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_id: training_source_id }),
          })
          if (!response.ok) {
            const errorData = await response.json()
            console.error('Error deleting training source:', errorData)
            throw new Error(
              errorData.error || 'Failed to delete training source'
            )
          }
          const { message } = await response.json()
          return message as string
        }
      },
      onSuccess: (message: string) => {
        if (message) toast.success(message)
      },
      onError: (error: Error) => {
        console.error('Error deleting training source:', error)
        toast.error(
          error.message || 'Failed to delete training source. Please try again.'
        )
      },
    })

  const fileLimitAndSizeCheck = (files: FileList | null) => {
    if (!files) return 'No files selected'
    if (files.length > 10) return 'You can only upload up to 10 files'
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024)
        return 'File size must be less than 10MB'
    }
    return null
  }

  const handleUrlAddition = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const id = nanoid(24)
    if (url.trim()) {
      setSources(prev => [
        ...prev,
        {
          id,
          type: 'url',
          value: url,
          status: 'pending',
          onDelete: async () => deleteTrainingSource(id),
        },
      ])
      setUrl('')
      toast.success('Url added successfully')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])]
    const message = fileLimitAndSizeCheck(files)
    const isInvalidFileTypeMessage = invalidFileTypes(files)
    if (message) {
      toast.error(message)
      return
    } else if (isInvalidFileTypeMessage) {
      toast.error(isInvalidFileTypeMessage)
      return
    } else {
      setSources(prev => {
        return [
          ...prev,
          ...files.map(file => ({
            id: nanoid(24),
            type: 'file',
            value: file.name,
            status: 'pending',
            onDelete: async () => deleteTrainingSource(file.name),
          })),
        ]
      })
      setFilesInfo(prev => [
        ...prev,
        ...files.map(file => ({
          id: nanoid(24),
          original_filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          file: file,
        })),
      ])
      toast.success('Files uploaded successfully')
    }
  }

  if (!selectedBot) {
    return <BotSelectionGrid bots={bots} onSelectBot={setSelectedBot} />
  }

  return (
    <main className='space-y-4'>
      <div className='flex items-end gap-2'>
        <Button
          variant='outline'
          type='button'
          size='default'
          className='h-8 px-2 flex items-center gap-1 font-normal text-xs rounded mr-2'
          onClick={() => setSelectedBot(null)}>
          <ArrowLeftIcon className='size-4 mr-1' />
          Back to Bot Selection
        </Button>
        <section className='space-y-1 flex-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Enter Url
          </Label>
          <div className='flex w-full items-end'>
            <Input
              type='text'
              placeholder='https://example.com'
              className='h-8 placeholder:text-xs w-full min-w-[180px] max-w-[330px] rounded-r-none border-r-0'
              style={{ fontSize: '0.65em' }}
              value={url}
              onChange={e => {
                setUrl(e.target.value)
              }}
            />
            <Button
              disabled={!url.trim()}
              variant='outline'
              size='default'
              className='h-8 px-3 text-xl flex items-center rounded-l-none border-l-0'
              onClick={handleUrlAddition}>
              +
            </Button>
          </div>
        </section>
      </div>
      <section className='space-y-4'>
        <Label className='text-xs font-medium text-muted-foreground'>
          Upload Files
        </Label>
        <Input
          id='file-input'
          type='file'
          multiple
          onChange={handleFileChange}
          className='text-xs placeholder:text-xs hidden'
        />
        <div
          className={cn('alert-muted cursor-pointer', 'py-6')}
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
        {sources.length > 0 && (
          <ResourceContainer
            resources={sources}
            isDisabled={
              isLoadingTrainingSources ||
              isPendingTraining ||
              isSourceDeletionLoading
            }
          />
        )}
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
            <h3 className='text-sm font-medium'>Training Progress</h3>
          </div>
          <div className='space-y-2'>
            <div className='space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-[0.65em] text-muted-foreground'>
                  Completed
                </span>
                <span className='text-[0.65em] font-medium text-foreground'>
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className='h-1.5 rounded-sm' />
            </div>
            <div className='pt-1.5 border-t space-y-1.5'>
              <div className='grid grid-cols-2 gap-x-3 gap-y-1.5'>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>
                    Total Files Uploaded
                  </span>
                  <span className='text-[0.65em] font-semibold text-foreground leading-tight'>
                    {totalFilesUploaded}
                  </span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>
                    Total Files Successfully Processed
                  </span>
                  <span className='text-[0.65em] font-semibold leading-tight text-emerald-600'>
                    {totalFilesProcessed}
                  </span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>
                    Failed Files
                  </span>
                  <span className='text-[0.65em] font-semibold text-rose-600 leading-tight'>
                    {failedFiles}
                  </span>
                </div>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[0.65em] text-muted-foreground leading-tight font-medium'>
                    Last Trained At
                  </span>
                  <span className='text-[0.65em] font-semibold text-foreground leading-tight'>
                    {lastTrainedAt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Button
          type='button'
          disabled={isPendingTraining || !selectedBot?.id}
          onClick={() => train_bot()}>
          {isPendingTraining ? 'Starting…' : 'Confirm and Start Training'}
        </Button>
      </section>
    </main>
  )
}
