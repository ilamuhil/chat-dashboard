'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  defaultCaptureConfig,
  type CaptureConfig,
} from '@/lib/widget/capture-config'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { ConversationStarterSettings } from '@/components/conversation-starter-settings'
import { captureConfigSchema } from '@/lib/widget/capture-config'
type CaptureState = {
  config: CaptureConfig
  updatedAt: string
  fields: Record<'name' | 'email' | 'phone', boolean>
}
export function BotCaptureSettings({ botId }: { botId: string }) {
  const [state, setState] = useState<CaptureState | null>(null)
  const [config, setConfig] = useState<CaptureConfig>(defaultCaptureConfig)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/bots/${botId}/capture`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error)
        return data as CaptureState
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setState(data)
        setConfig(data.config)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [botId, reload])
  const question = (
    id: string,
    patch: Partial<CaptureConfig['questions'][number]>,
  ) =>
    setConfig((c) => ({
      ...c,
      questions: c.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }))
  async function save() {
    if (!state) return
    const parsed = captureConfigSchema.safeParse(config)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Check these settings.')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`/api/bots/${botId}/capture`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: parsed.data,
          updatedAt: state.updatedAt,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setState({ ...state, config: parsed.data, updatedAt: data.updatedAt })
      setConfig(parsed.data)
      toast.success('Questions and sharing settings saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save settings')
    } finally {
      setSaving(false)
    }
  }
  const shareUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/chat/${botId}`
  return (
    <section className='dashboard-surface space-y-5 rounded-xl p-5'>
      <div>
        <h2 className='text-sm font-semibold'>Questions & hosted chat</h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          Configure required fields, questions, suggestions and hosted chat.
          Contact field visibility is managed under Bot configuration.
        </p>
      </div>
      {loading ? (
        <div
          role='status'
          className='flex items-center gap-2 py-6 text-sm text-muted-foreground'
        >
          <Loader2 className='size-4 animate-spin' />
          Loading capture settings…
        </div>
      ) : error ? (
        <div role='alert' className='space-y-2 text-sm'>
          <p>{error}</p>
          <Button
            variant='outline'
            onClick={() => {
              setLoading(true)
              setError('')
              setReload((x) => x + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <fieldset disabled={saving} className='space-y-3'>
            <legend className='mb-3 text-xs font-medium'>
              Required contact fields
            </legend>
            <div className='flex flex-wrap gap-5'>
              {(['name', 'email', 'phone'] as const).map((field) => (
                <label
                  key={field}
                  className='flex items-center gap-2 text-sm capitalize'
                >
                  <Checkbox
                    checked={!!state?.fields[field] && config.required[field]}
                    disabled={!state?.fields[field]}
                    onCheckedChange={(checked) =>
                      setConfig((c) => ({
                        ...c,
                        required: { ...c.required, [field]: checked === true },
                      }))
                    }
                  />
                  {field}
                  {!state?.fields[field] && (
                    <span className='text-xs normal-case text-muted-foreground'>
                      (hidden)
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <div className='space-y-3'>
            {config.questions.map((q, index) => (
              <fieldset
                key={q.id}
                disabled={saving}
                className='space-y-3 rounded-lg border border-border bg-background/50 p-4'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-medium'>
                    Question {index + 1}
                  </span>
                  <Button
                    type='button'
                    size='icon'
                    variant='ghost'
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        questions: c.questions.filter((x) => x.id !== q.id),
                      }))
                    }
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
                <Label htmlFor={`label-${q.id}`}>Question</Label>
                <Input
                  id={`label-${q.id}`}
                  value={q.label}
                  maxLength={160}
                  placeholder='For example: What is your highest qualification?'
                  onChange={(e) => question(q.id, { label: e.target.value })}
                />
                <div className='flex flex-wrap items-center gap-4'>
                  <label className='flex items-center gap-2 text-xs'>
                    Answer type
                    <select
                      className='rounded-md border border-input bg-background p-2 text-foreground'
                      value={q.type}
                      onChange={(e) =>
                        question(q.id, {
                          type: e.target.value as typeof q.type,
                          options: [],
                        })
                      }
                    >
                      <option value='text'>Short text</option>
                      <option value='number'>Number</option>
                      <option value='select'>Choices</option>
                      <option value='boolean'>Yes / No</option>
                    </select>
                  </label>
                  <label className='flex items-center gap-2 text-xs'>
                    <Checkbox
                      checked={q.required}
                      onCheckedChange={(v) =>
                        question(q.id, { required: v === true })
                      }
                    />
                    Required
                  </label>
                </div>
                {q.type === 'select' && (
                  <label className='block space-y-1 text-xs'>
                    <span>Options (one per line)</span>
                    <textarea
                      className='min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm text-foreground'
                      value={q.options.join('\n')}
                      onChange={(e) =>
                        question(q.id, { options: e.target.value.split('\n') })
                      }
                    />
                  </label>
                )}
              </fieldset>
            ))}
          </div>
          <Button
            type='button'
            variant='outline'
            disabled={saving || config.questions.length >= 3}
            onClick={() =>
              setConfig((c) => ({
                ...c,
                questions: [
                  ...c.questions,
                  {
                    id: `field_${crypto.randomUUID()}`,
                    label: '',
                    type: 'text',
                    required: false,
                    options: [],
                  },
                ],
              }))
            }
          >
            <Plus className='size-4' />
            Add question
          </Button>
          <p className='text-xs text-muted-foreground'>
            Up to 3 questions. Answers are saved with the lead; contact consent
            remains optional and separate.
          </p>
          <ConversationStarterSettings
            value={config.conversationStarters}
            disabled={saving}
            onChange={(conversationStarters) =>
              setConfig((c) => ({ ...c, conversationStarters }))
            }
          />
          <div className='space-y-3 border-t border-border pt-4'>
            <label className='flex items-center gap-2 text-sm font-medium'>
              <Checkbox
                checked={config.hostedEnabled}
                disabled={saving}
                onCheckedChange={(v) =>
                  setConfig((c) => ({ ...c, hostedEnabled: v === true }))
                }
              />
              Enable shareable chat page
            </label>
            <p className='text-xs text-muted-foreground'>
              Anyone with this public link can chat with this bot. Save to
              publish or disable the page.
            </p>
            {state?.config.hostedEnabled && (
              <div className='flex min-w-0 flex-wrap gap-2'>
                <Input
                  readOnly
                  aria-label='Hosted chat link'
                  value={shareUrl}
                  className='min-w-0 flex-1'
                />
                <Button
                  type='button'
                  variant='outline'
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(shareUrl)
                      .then(() => toast.success('Link copied'))
                      .catch(() => toast.error('Select and copy the link'))
                  }
                >
                  <Copy className='size-4' />
                  Copy
                </Button>
                <Button asChild variant='outline'>
                  <a href={shareUrl} target='_blank' rel='noopener noreferrer'>
                    <ExternalLink className='size-4' />
                    Open
                  </a>
                </Button>
              </div>
            )}
          </div>
          <div className='flex justify-end gap-2 border-t border-border pt-4'>
            <Button
              variant='outline'
              disabled={saving}
              onClick={() => {
                setLoading(true)
                setError('')
                setReload((x) => x + 1)
              }}
            >
              Reload saved settings
            </Button>
            <Button
              className={dashboardButtonClass}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving && <Loader2 className='size-4 animate-spin' />}
              {saving ? 'Saving…' : 'Save widget settings'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
