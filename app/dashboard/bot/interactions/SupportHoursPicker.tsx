'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  parseSupportHours,
  serializeSupportHours,
  SUPPORT_DAYS,
  SUPPORT_TIMEZONES,
  type SupportHoursValue,
} from '@/lib/widget/support-hours'

const DEFAULT_VALUE: SupportHoursValue = {
  version: 1,
  days: [],
  start: '09:00',
  end: '17:00',
  timezone: 'UTC',
}

type Props = {
  initialValue: string
  controlClassName: string
  descriptionClassName: string
}

export default function SupportHoursPicker(props: Props) {
  const parsed = parseSupportHours(props.initialValue)
  const [value, setValue] = useState<SupportHoursValue>(parsed ?? DEFAULT_VALUE)
  const [hasEdited, setHasEdited] = useState(Boolean(parsed))

  const update = (next: Partial<SupportHoursValue>) => {
    setHasEdited(true)
    setValue((current) => ({ ...current, ...next }))
  }

  const toggleDay = (day: string, checked: boolean) => {
    const days = checked
      ? [...value.days, day]
      : value.days.filter((selected) => selected !== day)
    update({ days })
  }

  return (
    <div className='space-y-3 md:col-span-2'>
      <input
        type='hidden'
        name='support_hours'
        value={
          hasEdited
            ? value.days.length
              ? serializeSupportHours(value)
              : ''
            : props.initialValue
        }
      />
      <div className='flex flex-wrap gap-x-4 gap-y-2'>
        {SUPPORT_DAYS.map((day) => (
          <label
            key={day.value}
            className='inline-flex cursor-pointer items-center gap-2 text-xs text-foreground'
          >
            <Checkbox
              checked={value.days.includes(day.value)}
              onCheckedChange={(checked) =>
                toggleDay(day.value, checked === true)
              }
            />
            {day.label}
          </label>
        ))}
      </div>
      {value.days.length > 0 && (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <div className='space-y-1.5'>
            <Label
              htmlFor='support-hours-start'
              className={props.descriptionClassName}
            >
              Opens
            </Label>
            <input
              id='support-hours-start'
              type='time'
              value={value.start}
              onChange={(event) => update({ start: event.target.value })}
              className={`w-full rounded-md border px-3 ${props.controlClassName}`}
            />
          </div>
          <div className='space-y-1.5'>
            <Label
              htmlFor='support-hours-end'
              className={props.descriptionClassName}
            >
              Closes
            </Label>
            <input
              id='support-hours-end'
              type='time'
              value={value.end}
              onChange={(event) => update({ end: event.target.value })}
              className={`w-full rounded-md border px-3 ${props.controlClassName}`}
            />
          </div>
          <div className='space-y-1.5'>
            <Label
              htmlFor='support-hours-timezone'
              className={props.descriptionClassName}
            >
              Time zone
            </Label>
            <select
              id='support-hours-timezone'
              value={value.timezone}
              onChange={(event) => update({ timezone: event.target.value })}
              className={`w-full rounded-md border bg-background px-3 ${props.controlClassName}`}
            >
              {SUPPORT_TIMEZONES.map((timezone) => (
                <option key={timezone.value} value={timezone.value}>
                  {timezone.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {value.days.length === 0 && (
        <p className={props.descriptionClassName}>
          Select at least one day to set support hours.
        </p>
      )}
      {!parsed && props.initialValue && (
        <p className={props.descriptionClassName}>
          The existing text format will be kept until you change these settings.
        </p>
      )}
    </div>
  )
}
