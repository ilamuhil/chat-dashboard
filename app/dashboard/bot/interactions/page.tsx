'use client'

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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

export default function BotInteractionsPage() {
  const [leadCapture, setLeadCapture] = useState(false)
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='dashboard-title'>Interactions</h1>
      </div>
      <div className='space-y-4'>
        <section className='grid grid-cols-2 gap-x-3 gap-y-6'>
          <div className='space-y-1'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Bot Name
            </Label>
            <Input
              type='text'
              placeholder='Ex: Siri, Alexa, etc.'
              className='text-xs'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Tone
            </Label>
            <Select>
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
              Role of the Bot
            </Label>
            <Select>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Customer Support' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='customer-support'>
                  Customer Support
                </SelectItem>
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
              First Message
            </Label>
            <Input
              type='text'
              placeholder='Ex: Hello, how can I help you today?'
              className='text-xs'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Lead Capture Message
            </Label>
            <Textarea
              placeholder='Can i please get your name and email for more information?'
              rows={4}
              className='text-xs min-h-[120px]'
            />
          </div>
          <div className='space-y-1'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Confirmation Message
            </Label>
            <Textarea
              placeholder='Thank you for your information! We will get back to you soon.'
              rows={4}
              className='text-xs min-h-[120px]'
            />
          </div>
          <div className='col-span-2 space-y-1'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Business Description
            </Label>
            <Textarea
              placeholder='Describe your business in a few sentences.'
              rows={6}
              className='text-xs min-h-[120px]'
            />
          </div>
          <div className='col-span-2 space-y-3'>
            <Label className='text-xs font-medium text-muted-foreground'>
              Enable Lead Capture ?
            </Label>
            <Switch
              id='lead-capture'
              className='mr-2'
              checked={leadCapture}
              onCheckedChange={() => setLeadCapture(!leadCapture)}
            />
          </div>
          <div
            className={cn('space-y-4', leadCapture ? 'block' : 'hidden')}>
            <Label className='text-xs font-medium text-muted-foreground'>
              Lead Capture Timing
            </Label>
            <RadioGroup defaultValue='before-conversation'>
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
          <div
            className={cn('space-y-4', leadCapture ? 'block' : 'hidden')}>
            <Label className='text-xs font-medium text-muted-foreground'>
              Lead Information to Capture
            </Label>
            <RadioGroup defaultValue='before-conversation'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'space-y-2',
                    leadCapture ? 'visible' : 'invisible'
                  )}>
                  <div className='flex items-center gap-3'>
                    <Checkbox id='r1' />
                    <Label
                      htmlFor='r1'
                      className='text-xs text-muted-foreground'>
                      Email
                    </Label>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Checkbox id='r2' />
                    <Label
                      htmlFor='r2'
                      className='text-xs text-muted-foreground focus:text-sky-800'>
                      Phone Number
                    </Label>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
          <Button className='mt-6 w-2/3'>Save Configuration</Button>
        </section>
      </div>
    </div>
  )
}
