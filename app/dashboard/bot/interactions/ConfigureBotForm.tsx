'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

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
import { useActionState, useState, useEffect } from 'react'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { cn } from '@/lib/core/utils'
import { Checkbox } from '@/components/ui/checkbox'
import {
  updateBotInteractions,
  type BotResult,
  type Bot,
  type BotFormValues,
} from './action'
import SupportHoursPicker from './SupportHoursPicker'
import WidgetVisibilityFields from './WidgetVisibilityFields'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { InfoIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type BotProps = {
  bot: Bot | null
}

const fieldLabelClass = 'text-xs font-medium text-muted-foreground'
const fieldControlClass = 'h-9 text-sm shadow-sm border-slate-200'
const sectionCardClass = 'dashboard-surface rounded-xl p-5 space-y-4'
const sectionTitleClass = 'text-sm font-semibold tracking-tight text-foreground'
const sectionDescClass = 'text-xs text-muted-foreground'

const ConfigureBotForm = (props: BotProps) => {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<
    BotResult | null,
    FormData
  >(updateBotInteractions, {
    bot: props.bot,
  })

  const bot = state?.bot || props.bot
  const values: BotFormValues | undefined = state?.formValues

  const [leadCapture, setLeadCapture] = useState(
    () => values?.capture_leads ?? bot?.capture_leads ?? false,
  )

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success)
      if (state.bot?.id)
        router.push(`/dashboard/bot/interactions/${state.bot.id}/widget`)
    }
    if (state?.error) {
      toast.error(
        typeof state.error === 'string'
          ? state.error
          : Object.values(state.error).flat()[0],
      )
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state?.nonce])

  return (
    <>
      <form
        key={state?.nonce || bot?.updated_at || bot?.id || 'new'}
        action={formAction}
        className='space-y-5'
      >
        <input type='hidden' name='bot_id' defaultValue={bot?.id || ''} />

        <WidgetVisibilityFields
          mode={
            values?.widget_visibility_mode ??
            bot?.widget_visibility_mode ??
            'all'
          }
          routes={
            values?.widget_visibility_routes ??
            bot?.widget_visibility_routes.join('\n') ??
            ''
          }
        />

        {/* Identity */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <h3 className={sectionTitleClass}>Identity</h3>
            <p className={sectionDescClass}>
              Basic details that define who this bot is.
            </p>
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label htmlFor='bot-name' className={fieldLabelClass}>
                Bot Name
              </Label>
              <Input
                id='bot-name'
                name='name'
                type='text'
                defaultValue={values?.name ?? bot?.name ?? ''}
                placeholder='Ex: Siri, Alexa, etc.'
                className={fieldControlClass}
                required
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='institute-name' className={fieldLabelClass}>
                Institute Name
              </Label>
              <Input
                id='institute-name'
                name='institute_name'
                type='text'
                defaultValue={
                  values?.institute_name ?? bot?.institute_name ?? ''
                }
                placeholder='Ex: Springfield Institute'
                className={fieldControlClass}
              />
            </div>
            <div className='space-y-1.5 md:col-span-2'>
              <Label htmlFor='bot-avatar-url' className={fieldLabelClass}>
                Bot avatar image URL (optional)
              </Label>
              <Input
                id='bot-avatar-url'
                name='avatar_url'
                type='url'
                maxLength={2048}
                defaultValue={values?.avatar_url ?? bot?.avatar_url ?? ''}
                placeholder='https://yourbusiness.com/bot-avatar.png'
                className={fieldControlClass}
              />
              <p className={sectionDescClass}>
                Use a square image over HTTPS. Leave blank to keep the default
                chatbot image. If an image cannot load, the widget uses the
                default.
              </p>
            </div>
            <div className='space-y-1.5'>
              <Label className={fieldLabelClass}>Tone</Label>
              <Select
                name='tone'
                required
                defaultValue={values?.tone ?? bot?.tone ?? ''}
              >
                <SelectTrigger className={cn('w-full', fieldControlClass)}>
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
            <div className='space-y-1.5'>
              <Label className={fieldLabelClass}>Role of the Bot</Label>
              <Select
                name='role'
                required
                defaultValue={values?.role ?? bot?.role ?? ''}
              >
                <SelectTrigger className={cn('w-full', fieldControlClass)}>
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
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <h3 className={sectionTitleClass}>Widget header & support</h3>
            <p className={sectionDescClass}>
              Help visitors find your team, contact details, and useful links.
              Optional fields appear only when filled in.
            </p>
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-1.5'>
              <div className='flex items-center gap-1.5'>
                <Label htmlFor='support-email' className={fieldLabelClass}>
                  Support email
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      aria-label='How the support email appears in the widget'
                      className='text-muted-foreground hover:text-foreground'
                    >
                      <InfoIcon className='size-3.5' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='right'
                    className='max-w-xs space-y-2 p-3'
                  >
                    <p>
                      Visitors can use the envelope in your chat header to open
                      their email app and contact this address.
                    </p>
                    <Image
                      src='/images/widget-support-email-guide.png'
                      width={864}
                      height={1254}
                      alt='Widget header with an arrow pointing to the quick email button'
                      className='max-h-80 w-auto rounded-lg'
                    />
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id='support-email'
                name='support_email'
                type='email'
                maxLength={254}
                defaultValue={values?.support_email ?? bot?.support_email ?? ''}
                placeholder='support@yourbusiness.com'
                className={fieldControlClass}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='support-team-name' className={fieldLabelClass}>
                Support team name
              </Label>
              <Input
                id='support-team-name'
                name='support_team_name'
                maxLength={60}
                defaultValue={
                  values?.support_team_name ?? bot?.support_team_name ?? ''
                }
                placeholder='Admissions team'
                className={fieldControlClass}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='human-reply-minutes' className={fieldLabelClass}>
                Typical human reply time (minutes)
              </Label>
              <Input
                id='human-reply-minutes'
                name='human_reply_minutes'
                type='number'
                min={1}
                max={10080}
                step={1}
                defaultValue={
                  values?.human_reply_minutes ?? bot?.human_reply_minutes ?? ''
                }
                placeholder='5'
                className={fieldControlClass}
              />
              <p className={sectionDescClass}>
                Shown when a visitor requests a person or joins a human chat.
                This is an estimate, not a live queue time.
              </p>
            </div>
            <div className='space-y-1.5 md:col-span-2'>
              <Label className={fieldLabelClass}>
                Human support hours & time zone
              </Label>
              <SupportHoursPicker
                initialValue={values?.support_hours ?? bot?.support_hours ?? ''}
                controlClassName={fieldControlClass}
                descriptionClassName={fieldLabelClass}
              />
            </div>
            <div className='space-y-1.5 md:col-span-2'>
              <Label htmlFor='help-center-url' className={fieldLabelClass}>
                Help centre link
              </Label>
              <Input
                id='help-center-url'
                name='help_center_url'
                type='url'
                maxLength={2048}
                defaultValue={
                  values?.help_center_url ?? bot?.help_center_url ?? ''
                }
                placeholder='https://yourbusiness.com/help'
                className={fieldControlClass}
              />
              <p className={sectionDescClass}>
                A quick link to FAQs, admissions guidance, or your support
                centre. Use an HTTPS address.
              </p>
            </div>
          </div>
        </section>

        {/* Conversation messages */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <h3 className={sectionTitleClass}>Conversation messages</h3>
            <p className={sectionDescClass}>
              What the bot says when greeting visitors and capturing leads.
            </p>
          </div>
          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label htmlFor='first-message' className={fieldLabelClass}>
                First Message
              </Label>
              <Input
                id='first-message'
                name='first_message'
                type='text'
                placeholder='Ex: Hello, how can I help you today?'
                className={fieldControlClass}
                defaultValue={values?.first_message ?? bot?.first_message ?? ''}
                required
              />
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label
                  htmlFor='lead-capture-message'
                  className={fieldLabelClass}
                >
                  Lead Capture Message
                </Label>
                <Textarea
                  id='lead-capture-message'
                  name='lead_capture_message'
                  placeholder='Can I please get your name and email for more information?'
                  rows={4}
                  className='min-h-28 resize-y border-slate-200 text-sm shadow-sm'
                  defaultValue={
                    values?.lead_capture_message ??
                    bot?.lead_capture_message ??
                    ''
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label
                  htmlFor='confirmation-message'
                  className={fieldLabelClass}
                >
                  Confirmation Message
                </Label>
                <Textarea
                  id='confirmation-message'
                  name='confirmation_message'
                  placeholder='Thank you for your information! We will get back to you soon.'
                  rows={4}
                  className='min-h-28 resize-y border-slate-200 text-sm shadow-sm'
                  defaultValue={
                    values?.confirmation_message ??
                    bot?.confirmation_message ??
                    ''
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Business description */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <div className='flex items-center gap-1.5'>
              <h3 className={sectionTitleClass}>Business description</h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    aria-label='Business description guidance'
                    className='text-muted-foreground transition-colors hover:text-foreground'
                  >
                    <InfoIcon className='size-3.5' />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side='right'
                  className='max-w-xs leading-relaxed'
                >
                  <p className='font-medium'>Keep it focused on:</p>
                  <ul className='mt-1 list-disc space-y-0.5 pl-4'>
                    <li>What the institute offers</li>
                    <li>Target students</li>
                    <li>Main programs or specialties</li>
                    <li>Location or delivery mode</li>
                    <li>Key differentiators</li>
                  </ul>
                  <p className='mt-1'>Maximum 600 words.</p>
                  <p className='mt-1 text-background/70'>
                    Avoid detailed fees, schedules, policies, or course content.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className={sectionDescClass}>
              A short overview the bot can use to understand your organization.
            </p>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='business-description' className='sr-only'>
              Business Description
            </Label>
            <Textarea
              id='business-description'
              name='business_description'
              placeholder='Describe your business in a few sentences.'
              rows={6}
              className='min-h-36 resize-y border-slate-200 text-sm shadow-sm'
              required
              defaultValue={
                values?.business_description ?? bot?.business_description ?? ''
              }
            />
          </div>
        </section>

        {/* Lead capture */}
        <section
          className={cn(
            'overflow-hidden rounded-xl border p-5 shadow-sm transition-[border-color,background-color] duration-300',
            leadCapture
              ? 'border-emerald-200/80 bg-linear-to-br from-emerald-50/70 via-white to-sky-50/40 dark:border-emerald-800/70 dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900'
              : 'border-slate-200/80 bg-linear-to-br from-slate-50 via-white to-sky-50/30 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/60',
          )}
        >
          <div className='flex items-start justify-between gap-4'>
            <div className='space-y-1'>
              <div className='flex items-center gap-1.5'>
                <h3 className={sectionTitleClass}>Lead capture</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      aria-label='Lead capture guidance'
                      className='text-muted-foreground transition-colors hover:text-foreground'
                    >
                      <InfoIcon className='size-3.5' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='right' className='max-w-xs'>
                    When enabled, the bot will try to capture the selected
                    information naturally from the visitor.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className={sectionDescClass}>
                Collect visitor details during the conversation.
              </p>
            </div>
            <div className='flex items-center gap-2 pt-0.5'>
              <Label
                htmlFor='lead-capture'
                className='min-w-7 text-xs font-medium text-muted-foreground transition-colors duration-200'
              >
                {leadCapture ? 'On' : 'Off'}
              </Label>
              <Switch
                id='lead-capture'
                name='capture_leads'
                checked={leadCapture}
                onCheckedChange={(checked) => setLeadCapture(checked)}
              />
            </div>
          </div>

          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
              leadCapture ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
            aria-hidden={!leadCapture}
          >
            <div className='min-h-0 overflow-hidden'>
              <div
                className={cn(
                  'mt-4 grid gap-4 border-t border-slate-200/70 pt-4 transition-[opacity,transform] dark:border-slate-700/70 duration-300 ease-out md:grid-cols-2',
                  leadCapture
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-1 opacity-0',
                )}
                {...(!leadCapture ? { inert: true } : {})}
              >
                <div className='space-y-3 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/50'>
                  <Label className={fieldLabelClass}>Lead Capture Timing</Label>
                  <RadioGroup
                    name='lead_capture_timing'
                    defaultValue={
                      values?.lead_capture_timing ||
                      (bot?.lead_capture_timing === 'start'
                        ? 'before-conversation'
                        : bot?.lead_capture_timing === 'after_first'
                          ? 'after-first-message'
                          : 'before-conversation')
                    }
                    className='space-y-2.5'
                  >
                    <div className='flex items-center gap-2.5'>
                      <RadioGroupItem value='before-conversation' id='r1' />
                      <Label
                        htmlFor='r1'
                        className='cursor-pointer text-xs font-normal text-foreground'
                      >
                        Before starting the conversation
                      </Label>
                    </div>
                    <div className='flex items-center gap-2.5'>
                      <RadioGroupItem value='after-first-message' id='r2' />
                      <Label
                        htmlFor='r2'
                        className='cursor-pointer text-xs font-normal text-foreground'
                      >
                        After the first message
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className='space-y-3 rounded-lg border border-white/70 bg-white/80 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/50'>
                  <Label className={fieldLabelClass}>
                    Lead Information to Capture
                  </Label>
                  <div className='space-y-2.5'>
                    <div className='flex items-center gap-2.5'>
                      <Checkbox
                        id='capture-name'
                        name='capture_name'
                        defaultChecked={
                          values?.capture_name ?? bot?.capture_name ?? false
                        }
                      />
                      <Label
                        htmlFor='capture-name'
                        className='cursor-pointer text-xs font-normal text-foreground'
                      >
                        Name
                      </Label>
                    </div>
                    <div className='flex items-center gap-2.5'>
                      <Checkbox
                        id='capture-email'
                        name='capture_email'
                        defaultChecked={
                          values?.capture_email ?? bot?.capture_email ?? false
                        }
                      />
                      <Label
                        htmlFor='capture-email'
                        className='cursor-pointer text-xs font-normal text-foreground'
                      >
                        Email
                      </Label>
                    </div>
                    <div className='flex items-center gap-2.5'>
                      <Checkbox
                        id='capture-phone'
                        name='capture_phone'
                        defaultChecked={
                          values?.capture_phone ?? bot?.capture_phone ?? false
                        }
                      />
                      <Label
                        htmlFor='capture-phone'
                        className='cursor-pointer text-xs font-normal text-foreground'
                      >
                        Phone Number
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className='flex justify-end'>
          <Button
            type='submit'
            disabled={isPending}
            className={cn(
              dashboardButtonClass,
              'h-10 w-full rounded-lg px-6 text-sm font-medium transition-all duration-200 md:w-auto',
            )}
          >
            {isPending ? (
              <>
                Saving… <Spinner />
              </>
            ) : (
              'Save & continue to widget settings'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

export default ConfigureBotForm
