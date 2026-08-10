'use client'
import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeftIcon,
  CloudUpload,
  Loader2,
  Link2Icon,
  PlusIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ResourceContainer from './ResourceContainer'
import { Bot } from '../interactions/action'
import BotSelectionGrid from './BotSelectionGrid'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { clientApiAxios } from '@/lib/axios-client'
import { isAxiosError } from 'axios'

type TrainingSourceType = 'url' | 'file'

type ApiTrainingSource = {
  id: string
  type: TrainingSourceType
  source_value: string | null
  original_filename?: string | null
  status: string | null // Can be any status from training_flow.md
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
    if (file.size > 10 * 1024 * 1024) return 'File size must be less than 10MB'
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
  const urlregex =
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
  if (!urlregex.test(url)) {
    throw new Error('Invalid URL')
  }
  const response = await clientApiAxios.post<{ message: string; id: string }>(
    '/api/training-source/url',
    { url: url, bot_id: botId }
  )
  return response
}

export default function TrainingDataClient({ bots }: Props) {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [url, setUrl] = useState('')
  const [isFileUploading, setIsFileUploading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Statuses that indicate active processing/training
  const activeStatuses: readonly string[] = [
    'queued_for_training',
    'training',
    'processing',
    'uploaded', // File uploaded, waiting for processing
    'pending', // Initial state, might be processing
  ]

  // Statuses that indicate completion (success)
  const completedStatuses: readonly string[] = ['trained', 'processed']

  // Statuses that indicate failure
  const failedStatuses: readonly string[] = [
    'training_failed',
    'processing_failed',
    'upload_failed',
  ]

  const {
    data: trainingSources = [],
    isLoading: isLoadingTrainingSources,
    isFetching: isFetchingTrainingSources,
    refetch: refetchTrainingSources,
  } = useQuery({
    queryKey: ['training-sources', selectedBot?.id],
    queryFn: async () => {
      if (!selectedBot?.id) return []
      const response = await clientApiAxios.get<{ sources: ApiTrainingSource[] }>(
        `/api/training/${selectedBot.id}`
      )
      return response.data.sources
    },
    enabled: !!selectedBot?.id,
    refetchInterval: query => {
      // Poll every 5 seconds if any source is in an active status
      const sources = query.state.data ?? []
      const hasActiveSources = sources.some(
        source => source.status && activeStatuses.includes(source.status)
      )
      return hasActiveSources ? 5000 : false
    },
  })

  // Calculate dynamic progress and stats
  const totalSourcesCount = trainingSources.length
  const trainedSourcesCount = trainingSources.filter(
    source => source.status && completedStatuses.includes(source.status)
  ).length
  const failedSourcesCount = trainingSources.filter(
    source => source.status && failedStatuses.includes(source.status)
  ).length
  const processedSourcesCount = trainedSourcesCount + failedSourcesCount
  const progress =
    totalSourcesCount > 0
      ? Math.round((processedSourcesCount / totalSourcesCount) * 100)
      : 0

  // Check if there are any active sources (polling/processing)
  const hasActiveSources = trainingSources.some(
    source => source.status && activeStatuses.includes(source.status)
  )

  const progressTone = hasActiveSources
    ? 'active'
    : progress === 100 && totalSourcesCount > 0
      ? 'complete'
      : 'idle'

  // query to queue training for the selected bot with the uploaded training sources and urls
  const { isPending: isPendingTraining, mutate: train_bot } = useMutation({
    mutationFn: async () => {
      if (!selectedBot?.id) throw new Error('Please select a bot to train')
      const source_ids = trainingSources
        .filter(source => source.status === 'created')
        .map(source => source.id)
      const response = await clientApiAxios.post<{ message: string }>(
        `/api/training/${selectedBot.id}`,
        {
          source_ids,
        }
      )
      return response.data.message
    },
    onSuccess: (message: string) => {
      toast.success(message)
      //replace all draft sources with the new training sources
      refetchTrainingSources()
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
        const source = trainingSources.find(
          source => source.id === training_source_id
        )
        if (!source) {
          throw new Error('Invalid training source selected for deletion')
        }
        if (!selectedBot?.id) throw new Error('No bot selected')
        const response = await clientApiAxios.request<{
          message?: string
          error?: string
        }>({
          method: 'DELETE',
          url: `/api/training-source/`,
          headers: { 'Content-Type': 'application/json' },
          data: { source_id: training_source_id, bot_id: selectedBot.id },
        })
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
          ? (error.response?.data?.error ??
            'Failed to delete training source. Please try again.')
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
            ? (error.response?.data?.error ??
              'Failed to add URL. Please try again.')
            : error instanceof Error
              ? error.message
              : 'Failed to add URL. Please try again.'
        )
      }
    },
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
        toast.success(finalizeRes.data.message ?? 'Upload complete', {
          id: toastId,
        })
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
          toast.error(
            'Invalid file upload request. Please check your files.',
            { id: toastId }
          )
        } else if (status === 401 || status === 403) {
          toast.error(
            'You are not authorized to upload files for this bot.',
            { id: toastId }
          )
        } else {
          toast.error('Upload failed. Please try again.', { id: toastId })
        }
      } else {
        toast.error('Upload failed. Please try again.', { id: toastId })
      }

      console.error('Upload error:', err)
    } finally {
      setIsFileUploading(false)
      refetchTrainingSources()
    }
  }

  if (!selectedBot) {
    return <BotSelectionGrid bots={bots} onSelectBot={setSelectedBot} />
  }

  return (
    <main className='space-y-6'>
      {/* Header / navigation */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex min-w-0 items-center gap-3'>
          <Button
            variant='outline'
            type='button'
            size='sm'
            className='h-9 shrink-0 gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium shadow-sm'
            onClick={() => setSelectedBot(null)}>
            <ArrowLeftIcon className='size-3.5' />
            Back
          </Button>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold text-foreground'>
              {selectedBot.name}
            </p>
            <p className='text-xs text-muted-foreground'>
              Add sources, then start training
            </p>
          </div>
        </div>

        <section className='w-full sm:max-w-md'>
          <Label
            htmlFor='training-url'
            className='mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
            <Link2Icon className='size-3.5' />
            Website URL
          </Label>
          <div className='flex items-stretch'>
            <Input
              id='training-url'
              type='text'
              placeholder='https://example.com'
              className='h-9 rounded-r-none border-slate-200 text-sm shadow-sm placeholder:text-muted-foreground/70'
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUrl()}
            />
            <Button
              disabled={!url.trim() || isUrlAdditionPending}
              variant='outline'
              size='sm'
              className='h-9 rounded-l-none border-l-0 border-slate-200 bg-slate-50 px-3 shadow-sm hover:bg-sky-50'
              onClick={() => addUrl()}>
              {isUrlAdditionPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <PlusIcon className='size-4' />
              )}
            </Button>
          </div>
        </section>
      </div>

      {/* Upload zone */}
      <section className='space-y-2'>
        <Label className='text-xs font-medium text-muted-foreground'>
          Upload files
        </Label>
        <Input
          id='file-input'
          type='file'
          multiple
          onChange={handleFileChange}
          className='hidden'
        />
        <div
          className={cn(
            'group relative overflow-hidden rounded-xl border border-dashed border-slate-300 bg-linear-to-b from-slate-50 via-white to-sky-50/40 px-6 py-8 text-center transition-all duration-300',
            isFileUploading
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:border-sky-300 hover:from-sky-50/60 hover:to-white hover:shadow-sm'
          )}
          onClick={() => {
            if (isFileUploading) return
            document.getElementById('file-input')?.click()
          }}>
          <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-300/50 to-transparent' />
          <div className='mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-slate-100 text-sky-700 shadow-sm ring-1 ring-sky-200/60 transition-transform duration-200 group-hover:scale-105'>
            {isFileUploading ? (
              <Loader2 className='size-5 animate-spin' />
            ) : (
              <CloudUpload className='size-5' />
            )}
          </div>
          <p className='mb-1 text-sm font-medium text-foreground'>
            {isFileUploading
              ? 'Uploading files…'
              : 'Click to upload or drag and drop'}
          </p>
          <p className='text-xs text-muted-foreground'>
            PDF, DOC, DOCX, TXT · Max 10MB per file · Up to 10 files
          </p>
        </div>
      </section>

      <ResourceContainer
        loading={isLoadingTrainingSources}
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
          },
        }))}
        isDisabled={
          isLoadingTrainingSources ||
          isPendingTraining ||
          isSourceDeletionLoading
        }
      />

      {/* Progress + actions */}
      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-stretch'>
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border p-5 shadow-sm',
            progressTone === 'active' &&
              'border-amber-200/80 bg-linear-to-br from-amber-50/90 via-white to-orange-50/50',
            progressTone === 'complete' &&
              'border-emerald-200/80 bg-linear-to-br from-emerald-50/90 via-white to-teal-50/40',
            progressTone === 'idle' &&
              'border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-sky-50/40'
          )}>
          <div
            className={cn(
              'pointer-events-none absolute -right-8 -top-8 size-32 rounded-full blur-3xl',
              progressTone === 'active' && 'bg-amber-300/25',
              progressTone === 'complete' && 'bg-emerald-300/25',
              progressTone === 'idle' && 'bg-sky-300/20'
            )}
          />

          <div className='relative mb-4 flex items-start justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold tracking-tight text-foreground'>
                Training progress
              </h3>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                {hasActiveSources
                  ? 'Sources are being processed…'
                  : progress === 100 && totalSourcesCount > 0
                    ? 'All resources have been processed'
                    : 'Waiting to start training'}
              </p>
            </div>
            {isFetchingTrainingSources && (
              <span className='inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-slate-200/70'>
                <Loader2 className='size-3 animate-spin' />
                Syncing
              </span>
            )}
          </div>

          <div className='relative space-y-3'>
            <div className='flex items-end justify-between gap-3'>
              <span className='text-xs font-medium text-muted-foreground'>
                Overall completion
              </span>
              <span
                className={cn(
                  'text-2xl font-semibold tracking-tight tabular-nums',
                  progressTone === 'active' && 'text-amber-700',
                  progressTone === 'complete' && 'text-emerald-700',
                  progressTone === 'idle' && 'text-slate-800'
                )}>
                {progress}
                <span className='ml-0.5 text-sm font-medium text-muted-foreground'>
                  %
                </span>
              </span>
            </div>

            <div
              className={cn(
                'relative h-3 w-full overflow-hidden rounded-full',
                progressTone === 'active' && 'bg-amber-100/80',
                progressTone === 'complete' && 'bg-emerald-100/80',
                progressTone === 'idle' && 'bg-slate-200/80'
              )}>
              <div
                className={cn(
                  'training-progress-fill relative h-full rounded-full transition-[width] duration-700 ease-out',
                  progressTone === 'active' &&
                    'bg-linear-to-r from-amber-400 via-orange-500 to-amber-400 bg-size-[200%_100%] training-progress-active',
                  progressTone === 'complete' &&
                    'bg-linear-to-r from-emerald-400 to-teal-500',
                  progressTone === 'idle' &&
                    'bg-linear-to-r from-sky-500 to-slate-700',
                  progress > 0 && progressTone === 'active' && 'shadow-[0_0_12px_rgba(245,158,11,0.45)]',
                  progress > 0 && progressTone === 'complete' && 'shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                )}
                style={{ width: `${Math.max(progress, progress > 0 ? 2 : 0)}%` }}>
                {progressTone === 'active' && progress > 0 && (
                  <span className='training-progress-sheen absolute inset-0' />
                )}
              </div>
            </div>

            <div className='grid grid-cols-2 gap-2.5 pt-1 sm:grid-cols-4'>
              {[
                {
                  label: 'Total',
                  value: totalSourcesCount,
                  valueClass: 'text-foreground',
                },
                {
                  label: 'Success',
                  value: trainedSourcesCount,
                  valueClass: 'text-emerald-600',
                },
                {
                  label: 'Failed',
                  value: failedSourcesCount,
                  valueClass: 'text-rose-600',
                },
                {
                  label: 'Processed',
                  value: `${processedSourcesCount}/${totalSourcesCount}`,
                  valueClass: 'text-foreground',
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  className='rounded-lg border border-white/70 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm'>
                  <p className='text-[11px] font-medium text-muted-foreground'>
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-sm font-semibold tabular-nums',
                      stat.valueClass
                    )}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='dashboard-surface flex flex-col justify-between gap-4 rounded-xl p-5'>
          <div className='space-y-1'>
            <h3 className='text-sm font-semibold tracking-tight text-foreground'>
              Ready to train
            </h3>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              Confirm the terms below, then start training so the bot can learn
              from your sources.
            </p>
          </div>

          <div className='flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/80 p-3'>
            <Checkbox
              id='terms-and-conditions'
              checked={termsAccepted}
              className={cn(
                'mt-0.5',
                !termsAccepted && 'border-rose-400',
                termsAccepted && 'border-emerald-500 data-[state=checked]:bg-emerald-600'
              )}
              onCheckedChange={value => setTermsAccepted(value === true)}
            />
            <Label
              htmlFor='terms-and-conditions'
              className={cn(
                'cursor-pointer text-xs leading-relaxed font-normal',
                !termsAccepted && 'text-slate-600',
                termsAccepted && 'text-emerald-700'
              )}>
              I agree to the terms and conditions and privacy policy for the data
              submitted.
            </Label>
          </div>

          <Button
            type='button'
            className='h-10 w-full rounded-lg bg-linear-to-r from-slate-800 to-sky-800 text-sm font-medium shadow-sm transition-all duration-200 hover:from-slate-900 hover:to-sky-900 disabled:from-slate-300 disabled:to-slate-300'
            disabled={
              isPendingTraining ||
              hasActiveSources ||
              !selectedBot?.id ||
              isSourceDeletionLoading ||
              isUrlAdditionPending ||
              isLoadingTrainingSources ||
              isFileUploading ||
              processedSourcesCount === totalSourcesCount ||
              !termsAccepted ||
              trainingSources?.length === 0
            }
            onClick={() => train_bot()}>
            {isPendingTraining || hasActiveSources ? (
              <span className='flex items-center gap-2'>
                <Loader2 className='size-4 animate-spin' />
                Processing…
              </span>
            ) : (
              'Train Bot'
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}
