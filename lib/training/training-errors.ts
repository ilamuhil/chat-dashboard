export type TrainingError = {
  id: string
  code: string
  stage: string
  message: string
  action: string
  retryable: boolean
  occurred_at: string
  job_id: string | null
  source_id: string | null
  resolved_at: string | null
}

export function trainingErrors(value: unknown): TrainingError[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is TrainingError =>
    !!item && typeof item === 'object' && typeof item.id === 'string' &&
    typeof item.code === 'string' && typeof item.stage === 'string' &&
    typeof item.message === 'string' && typeof item.action === 'string' &&
    typeof item.occurred_at === 'string' && typeof item.retryable === 'boolean'
  )
}

export function queueError(sourceId: string, code = 'training_service_unavailable'): TrainingError {
  return {
    id: crypto.randomUUID(), code, stage: 'queue',
    message: 'The training service could not be reached to queue this source.',
    action: 'Retry training when the service is available.', retryable: true,
    occurred_at: new Date().toISOString(), job_id: null, source_id: sourceId,
    resolved_at: null,
  }
}
