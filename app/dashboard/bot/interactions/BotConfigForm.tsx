'use client'

import { useActionState, useEffect,useState } from 'react'
import { updateBotInteractions } from './action'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
type BotConfig = {
  id: string
  name: string
  tone: string
  role: string
  first_message: string
  lead_capture_message: string
  confirmation_message: string
  business_description: string
  capture_leads: boolean
  lead_capture_timing?: string
  capture_name?: boolean
  capture_email?: boolean
  capture_phone?: boolean
  created_at?: string
  updated_at?: string
}

type BotConfigResult = {
  error?: string | Record<string, string[]>
  success?: string
  botConfig?: BotConfig
}

type Props = {
  botConfig: BotConfig | null
}

const BotConfigForm = ({ botConfig }: Props) => {
  const [botConfigSubmitAction, botConfigFormState, isPending] = useActionState<
    BotConfigResult | null,
    FormData
  >(updateBotInteractions, {
    error: null,
    success: null,
    botConfig: botConfig,
  })

  const [captureLeads, setCaptureLeads] = useState(false)
  const errorMessage =
    typeof botConfigFormState?.error === 'string'
      ? botConfigFormState.error
      : botConfigFormState?.error
      ? Object.values(botConfigFormState.error).flat()[0]
      : null

  const successMessage = botConfigFormState?.success

  

  useEffect(() => {
    if (!botConfigFormState) return
    if (botConfigFormState?.success) {
      toast.success(botConfigFormState.success, { position: 'top-center' })
    }
    if (botConfigFormState?.error) {
      toast.error(botConfigFormState.error, { position: 'top-center' })
    }
  }, [botConfigFormState])

  return (
    <form className='space-y-4'>
      <section className='grid grid-cols-2 gap-x-3 gap-y-6'>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Bot Name*
          </Label>
          <Input
            name='name'
            type='text'
            placeholder='Ex: Siri, Alexa, etc.'
            className='text-xs'
            required
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Tone*
          </Label>
          <Select name='tone' required>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Friendly' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='friendly'>Friendly</SelectItem>
              <SelectItem value='professional'>Professional</SelectItem>
              <SelectItem value='enthusiastic'>Enthusiastic</SelectItem>
              <SelectItem value='casual'>Casual</SelectItem>
              <SelectItem value='concise'>Concise</SelectItem>
              <SelectItem value='empathetic'>Empathetic</SelectItem>
              <SelectItem value='humorous'>Humorous</SelectItem>
              <SelectItem value='authoritative'>Authoritative</SelectItem>
              <SelectItem value='formal'>Formal</SelectItem>
              <SelectItem value='neutral'>Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Role of the Bot*
          </Label>
          <Select name='role' required>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Customer Support' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='customer-support'>Customer Support</SelectItem>
              <SelectItem value='sales'>Sales</SelectItem>
              <SelectItem value='marketing'>Marketing</SelectItem>
              <SelectItem value='technical-support'>
                Technical Support
              </SelectItem>
              <SelectItem value='other'>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            First Message*
          </Label>
          <Input
            name='first_message'
            type='text'
            placeholder='Ex: Hello, how can I help you today?'
            className='text-xs'
            required
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Lead Capture Message
          </Label>
          <Textarea
            name='lead_capture_message'
            placeholder='Can i please get your name and email for more information?'
            rows={4}
            className='text-xs min-h-[120px]'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Confirmation Message*
          </Label>
          <Textarea
            name='confirmation_message'
            placeholder='Thank you for your information! We will get back to you soon.'
            rows={4}
            className='text-xs min-h-[120px]'
            required
          />
        </div>
        <div className='col-span-2 space-y-1'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Business Description*
          </Label>
          <Textarea
            name='business_description'
            placeholder='Describe your business in a few sentences.'
            rows={6}
            className='text-xs min-h-[120px]'
            required
          />
        </div>
        <div className='col-span-2 space-y-3'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Enable Lead Capture ?
          </Label>
          <Switch
            id='lead-capture'
            name='capture_leads'
            className='mr-2'
            checked={captureLeads || false}
            onCheckedChange={setCaptureLeads}
          />
          <input type="hidden" name="capture_leads" value={captureLeads ? true : false} />
        </div>
        <div className={cn('space-y-4', captureLeads ? 'block' : 'hidden')}>
          <Label className='text-xs font-medium text-muted-foreground'>
            Lead Capture Timing*
          </Label>
          <RadioGroup
            name='lead_capture_timing'
            defaultValue='before-conversation'>
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='before-conversation' id='r1' />
              <Label htmlFor='r1' className='text-xs text-muted-foreground'>
                Before starting the conversation
              </Label>
            </div>
            <div className='flex items-center gap-3'>
              <RadioGroupItem value='after-first-message' id='r2' />
              <Label
                htmlFor='r2'
                className='text-xs text-muted-foreground focus:text-sky-800'>
                After the first message
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div className={cn('space-y-4', captureLeads ? 'block' : 'hidden')}>
          <Label className='text-xs font-medium text-muted-foreground'>
            Lead Information to Capture*
          </Label>
          <RadioGroup defaultValue='before-conversation'>
            <div className='flex items-center gap-3'>
              <div
                className={cn(
                  'space-y-2',
                  captureLeads ? 'visible' : 'invisible'
                )}>
                <div className='flex items-center gap-3'>
                  <Checkbox id='capture-email' name='captureEmail' />
                  <Label
                    htmlFor='capture-email'
                    className='text-xs text-muted-foreground'>
                    Email
                  </Label>
                </div>
                <div className='flex items-center gap-3'>
                  <Checkbox id='capture-phone' name='capturePhone' />
                  <Label
                    htmlFor='capture-phone'
                    className='text-xs text-muted-foreground focus:text-sky-800'>
                    Phone Number
                  </Label>
                </div>
                <div className='flex items-center gap-3'>
                  <Checkbox id='capture-name' name='captureName' />
                  <Label
                    htmlFor='capture-name'
                    className='text-xs text-muted-foreground'>
                    Name
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
        <Button
          type='submit'
          disabled={isPending}
          formAction={botConfigSubmitAction}
          className='m lg:w-[40%] md:w-1/2 w-full'>
          {isPending ? (
            <>
              Saving... <Spinner />
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </section>
    </form>
  )
}

export default BotConfigForm
