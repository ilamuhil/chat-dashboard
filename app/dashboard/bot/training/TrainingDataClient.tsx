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
import { toast } from 'sonner'
import { clientApiAxios } from "@/lib/axios-client"
import { isAxiosError } from 'axios'
import { type StatusChipStatus } from '@/components/status-chip'

type TrainingSourceStatus = 'pending' | 'created' | 'processing' | 'completed' | 'failed'
type TrainingSourceType = 'url' | 'file'



type ApiTrainingSource = {
  id: string
  type: TrainingSourceType
  source_value: string | null
  original_filename?: string | null
  status: TrainingSourceStatus
  file?: {
    original_filename?: string | null
    path?: string | null
  } | null
}

type Props = {
  bots: Bot[]
}

const fileLimitAndSizeCheck = (files: File[] | FileList | null) => {
  if (!files) return 'No files selected'
  const list = Array.isArray(files) ? files : Array.from(files)
  if (list.length > 10) return 'You can only upload up to 10 files'
  for (const file of list) {
    if (file.size > 10 * 1024 * 1024)
      return 'File size must be less than 10MB'
  }
  return null
}

const invalidFileTypes = (files: File[]) => {
  const allowed = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ])
  const invalid = files.filter(f => !allowed.has(f.type))
  if (invalid.length === 0) return null
  return `Invalid file type(s): ${invalid.map(f => f.name).join(', ')}`
}

const handleUrlAddition = async (url: string, botId: string) => {

  //verify url is valid
  const urlregex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
  if (!urlregex.test(url)) {
    throw new Error('Invalid URL')
  }
  const response = await clientApiAxios.post<{ message: string, id: string }>(
    '/api/training-source/url',
    { url: url, bot_id: botId }
  )
  return response
}

export default function TrainingDataClient({ bots }: Props) {
  const [progress] = useState(45) // Dummy value
  // Dummy values for training stats
  const [totalFilesUploaded] = useState(0)
  const [totalFilesProcessed] = useState(0)
  const [failedFiles] = useState(0)
  const [lastTrainedAt] = useState('')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [url, setUrl] = useState('')
  const [isFileUploading, setIsFileUploading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const {
    data: trainingSources,
    isLoading: isLoadingTrainingSources,
    isFetching: isFetchingTrainingSources,
    refetch: refetchTrainingSources,
  } =
    useQuery({
      queryKey: ['training-sources', selectedBot?.id],
      // refetchInterval: q => {
      //   console.log('q', q)
      //   const statuses = (q.state.data ?? { sources: [] }).sources.map(
      //     source => source.status
      //   )
      //   return statuses.some(status =>
      //     ['pending', 'processing'].includes(status)
      //   )
      //     ? 5000
      //     : false
      // },
      queryFn: async () => {
        if (!selectedBot?.id) return []
        const response = await clientApiAxios.get<{ sources: ApiTrainingSource[] }>(
          `/api/training/${selectedBot.id}`
        )
        return response.data.sources
      },
      initialData: [] as ApiTrainingSource[],
      enabled: !!selectedBot?.id,
    })



  // query to queue training for the selected bot with the uploaded training sources and urls
  const { isPending: isPendingTraining, mutate: train_bot } = useMutation({
    mutationFn: async () => {
      if (!selectedBot?.id) throw new Error('Please select a bot to train')
      const source_ids = trainingSources.filter(source => source.status === 'created').map(source => source.id)
      const response = await clientApiAxios.post<{ message: string }>(
        `/api/training/${selectedBot.id}`,
        {
          source_ids
        }
      )
      return response.data.message
    },
    onSuccess: (message: string) => {
      toast.success(message)
      //replace all draft sources with the new training sources
      refetchTrainingSources()
      toast.success('Training started successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to train bot. Please try again.')
    },

  })

  //!NOTE: All deletion should be done in server side.
  

  const { isPending: isSourceDeletionLoading, mutate: deleteTrainingSource } =
    useMutation({
      mutationFn: async (training_source_id: string) => {
        if (!training_source_id) {
          throw new Error('Invalid training source selected for deletion')
        }
        const source = trainingSources.find(source => source.id === training_source_id)
        if (!source) {
          throw new Error('Invalid training source selected for deletion')
        }
        if (!selectedBot?.id) throw new Error('No bot selected')
        const response =await clientApiAxios.delete<{ message?: string; error?: string }>(
          `/api/training-source/`,
          {
            headers: { 'Content-Type': 'application/json' },
            data: { source_id: training_source_id,bot_id: selectedBot.id },
          }
        )
        return response.data?.message ?? 'Deleted successfully'
      },
      onMutate: () => {
        const toastId = toast.loading('Deleting resource. Please wait...')
        return { toastId }
      },
      onSuccess: (message: string, _vars, ctx) => {
        toast.success(message || 'Deleted successfully', { id: ctx?.toastId })
        refetchTrainingSources()
      },
      onError: (error: unknown, _vars, ctx) => {
        console.error('Error deleting training source:', error)
        const message = isAxiosError(error)
          ? error.response?.data?.error ?? 'Failed to delete training source. Please try again.'
          : error instanceof Error
          ? error.message
          : 'Failed to delete training source. Please try again.'
        toast.error(message, { id: ctx?.toastId })
      },
    })



  const { isPending: isUrlAdditionPending, mutate: addUrl } = useMutation({
    mutationFn: async () => {
      try {
        if (!selectedBot?.id) throw new Error('Please select a bot to train')
        const response = await handleUrlAddition(url, selectedBot.id)
        toast.success(response.data.message)
        refetchTrainingSources()
        setUrl('')
      } catch (error: unknown) {
        console.error('Error adding URL:', error)
        toast.error(
          isAxiosError(error)
            ? error.response?.data?.error ?? 'Failed to add URL. Please try again.'
            : error instanceof Error
              ? error.message
              : 'Failed to add URL. Please try again.'
        )
      }
    }
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const toastId = toast.loading('Uploading files...')
    setIsFileUploading(true)
    try {
      const files = Array.from(e.target.files ?? [])
      e.target.value = '' // allow re-selecting the same files

      if (files.length === 0) {
        toast.error('No files selected', { id: toastId })
        return
      }

      const sizeError = fileLimitAndSizeCheck(files)
      if (sizeError) {
        toast.error(sizeError, { id: toastId })
        return
      }

      const typeError = invalidFileTypes(files)
      if (typeError) {
        toast.error(typeError, { id: toastId })
        return
      }

      const formData = new FormData()
      formData.append('bot_id', selectedBot?.id ?? '')
      files.forEach(file => formData.append('files', file))

      const initRes = await clientApiAxios.post<{ trainingSourceIds: string[] }>(
        '/api/training-source/file/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      const sourceIds = initRes.data.trainingSourceIds

      if (!sourceIds || sourceIds.length === 0) {
        toast.error('No files were accepted for upload.', { id: toastId })
        return
      }
      refetchTrainingSources()

      const finalizeRes = await clientApiAxios.post<{
        message: string
        allSourcesVerified: boolean
        verifiedSourceIds: string[]
        unverifiedSourceIds: string[]
      }>('/api/training-source/file/finalize', {
        bot_id: selectedBot?.id,
        source_ids: sourceIds,
      })

      if (finalizeRes.data.verifiedSourceIds.length > 0) {
        toast.success(
          `${finalizeRes.data.verifiedSourceIds.length} file(s) ready for training`,
          { id: toastId }
        )
      } else {
        toast.success(finalizeRes.data.message ?? 'Upload complete', { id: toastId })
      }

      if (finalizeRes.data.unverifiedSourceIds.length > 0) {
        toast.warning(
          `${finalizeRes.data.unverifiedSourceIds.length} file(s) not uploaded yet. Please retry.`,
          { duration: Infinity, dismissible: true, id: toastId }
        )
      }
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status

        if (status === 400) {
          toast.error('Invalid file upload request. Please check your files.', { id: toastId })
        } else if (status === 401 || status === 403) {
          toast.error('You are not authorized to upload files for this bot.', { id: toastId })
        } else {
          toast.error('Upload failed. Please try again.', { id: toastId })
        }
      } else {
        toast.error('Upload failed. Please try again.', { id: toastId })
      }

      console.error('Upload error:', err)

    }
    finally {
      setIsFileUploading(false)
      refetchTrainingSources()
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
              onKeyDown={e => e.key === 'Enter' && addUrl()}
            />
            <Button
              disabled={!url.trim() || isUrlAdditionPending}
              variant='outline'
              size='default'
              className='h-8 px-3 text-xl flex items-center rounded-l-none border-l-0'
              onClick={() => addUrl()}>
              {isUrlAdditionPending ? (
                <span className="flex items-center justify-center">
                  <span className="inline-block h-4 w-4 border-2 border-t-transparent border-current rounded-full animate-spin"></span>
                </span>
              ) : (
                '+'
              )}
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
          className={cn(
            'alert-muted',
            'py-6',
            isFileUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          )}
          onClick={() => {
            if (isFileUploading) return
            document.getElementById('file-input')?.click()
          }}>
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
            loading={isLoadingTrainingSources || isFetchingTrainingSources}
            resources={trainingSources.map(source => ({
              id: source.id,
              type: source.type,
              value:
                (source.type === 'file'
                  ? source.original_filename
                  : source.source_value) ??
                source.file?.path ??
                source.file?.original_filename ??
                '',
              status: source.status,
              onDelete: () => {
                deleteTrainingSource(source.id)
              }
            }))}
            isDisabled={
              isLoadingTrainingSources ||
              isPendingTraining ||
              isSourceDeletionLoading
            }
          />
        
        <Separator />
        <div className='flex items-center gap-2'>
          <Checkbox
            id='terms-and-conditions'
            checked={termsAccepted}
            onCheckedChange={(value) => setTermsAccepted(value === true)}
          />
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
          disabled={
            isPendingTraining ||
            !selectedBot?.id ||
            isSourceDeletionLoading ||
            isUrlAdditionPending ||
            isLoadingTrainingSources ||
            isFileUploading ||
            !termsAccepted || trainingSources?.length === 0
          }
          onClick={() => train_bot()}>
          {isPendingTraining ? 'Starting…' : 'Confirm and Start Training'}
        </Button>
      </section>
    </main>
  )
}
