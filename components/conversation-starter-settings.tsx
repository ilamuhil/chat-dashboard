'use client'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  starterTemplates,
  type CaptureConfig,
} from '@/lib/widget/capture-config'

export function ConversationStarterSettings({
  value,
  onChange,
  disabled,
}: {
  value: CaptureConfig['conversationStarters']
  onChange: (value: CaptureConfig['conversationStarters']) => void
  disabled: boolean
}) {
  function move(index: number, offset: number) {
    const questions = [...value.questions]
    ;[questions[index], questions[index + offset]] = [
      questions[index + offset],
      questions[index],
    ]
    onChange({ ...value, questions })
  }
  return (
    <fieldset
      disabled={disabled}
      className='space-y-4 border-t border-border pt-5'
    >
      <legend className='sr-only'>Suggested questions</legend>
      <label className='flex items-center gap-2 text-sm font-semibold'>
        <Checkbox
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({
              enabled: checked === true,
              questions:
                checked && !value.questions.length
                  ? [...starterTemplates.slice(0, 3)]
                  : value.questions,
            })
          }
        />
        Show suggested questions
      </label>
      <p className='text-xs leading-relaxed text-muted-foreground'>
        Help visitors start a conversation after submitting their details. When
        the capture form is off, questions appear when chat is ready. They
        disappear after the first visitor message. Saved changes appear when the
        widget next loads or a new conversation starts.
      </p>
      {value.enabled && (
        <>
          <div className='space-y-3'>
            {value.questions.map((question, index) => (
              <div
                key={index}
                className='space-y-2 rounded-lg border border-border bg-background/50 p-3'
              >
                <div className='flex items-center justify-between gap-2'>
                  <Label htmlFor={`starter-${index}`} className='text-xs'>
                    Suggested question {index + 1}
                  </Label>
                  <div className='flex shrink-0'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-7'
                      aria-label={`Move suggested question ${index + 1} up`}
                      disabled={disabled || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-7'
                      aria-label={`Move suggested question ${index + 1} down`}
                      disabled={
                        disabled || index === value.questions.length - 1
                      }
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className='size-3.5' />
                    </Button>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='size-7'
                      aria-label={`Remove suggested question ${index + 1}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          questions: value.questions.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
                <Input
                  id={`starter-${index}`}
                  maxLength={120}
                  value={question}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      questions: value.questions.map((text, i) =>
                        i === index ? event.target.value : text,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={disabled || value.questions.length >= 4}
            onClick={() =>
              onChange({ ...value, questions: [...value.questions, ''] })
            }
          >
            <Plus className='size-4' />
            Add suggested question
          </Button>
          <p className='text-xs text-muted-foreground'>
            Up to 4 questions, 120 characters each. The exact button text is
            sent as the visitor’s message.
          </p>
          <details className='rounded-lg border border-border p-3 text-xs'>
            <summary className='cursor-pointer font-medium'>
              Guide: choose questions that help students
            </summary>
            <p className='mt-2 leading-relaxed text-muted-foreground'>
              Start with three questions covering course discovery,
              affordability and entry requirements. Use words students use, keep
              each question focused, and avoid promises about eligibility or
              admission. Test every question against your bot’s current training
              material before publishing. Replace questions that the bot cannot
              answer.
            </p>
            <p className='mt-3 font-medium'>Add an editable example</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {starterTemplates.map((template) => (
                <Button
                  key={template}
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-auto whitespace-normal py-2 text-left text-xs'
                  disabled={
                    disabled ||
                    value.questions.length >= 4 ||
                    value.questions.some(
                      (q) => q.trim().toLowerCase() === template.toLowerCase(),
                    )
                  }
                  onClick={() =>
                    onChange({
                      ...value,
                      questions: [...value.questions, template],
                    })
                  }
                >
                  {template}
                </Button>
              ))}
            </div>
          </details>
          {value.questions.some((q) => q.trim()) && (
            <div className='rounded-lg bg-muted/40 p-3'>
              <p className='mb-2 text-xs font-medium text-muted-foreground'>
                Visitor preview
              </p>
              <div className='flex flex-col items-end gap-2'>
                {value.questions
                  .filter((q) => q.trim())
                  .map((q, i) => (
                    <span
                      key={i}
                      className='max-w-full break-words rounded-2xl border border-border bg-background px-3 py-2 text-xs shadow-sm'
                    >
                      {q}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </fieldset>
  )
}
