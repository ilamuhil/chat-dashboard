'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function WidgetVisibilityFields({
  mode,
  routes,
}: {
  mode: string
  routes: string
}) {
  const [selectedMode, setSelectedMode] = useState(mode)
  return (
    <section className='dashboard-surface rounded-xl p-5 space-y-4'>
      <div className='space-y-1 border-b border-slate-100 pb-3'>
        <h3 className='text-sm font-semibold tracking-tight'>
          Widget visibility
        </h3>
        <p className='text-xs text-muted-foreground'>
          Choose which pages on your website show this bot.
        </p>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='widget-visibility-mode'>Show the widget</Label>
        <select
          id='widget-visibility-mode'
          name='widget_visibility_mode'
          value={selectedMode}
          onChange={(event) => setSelectedMode(event.target.value)}
          className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
        >
          <option value='all'>On all routes</option>
          <option value='include'>Only on these routes</option>
          <option value='exclude'>On all routes except these</option>
        </select>
      </div>
      <div className='space-y-1.5' hidden={selectedMode === 'all'}>
        <Label htmlFor='widget-visibility-routes'>Website routes</Label>
        <Textarea
          id='widget-visibility-routes'
          name='widget_visibility_routes'
          defaultValue={routes}
          required={selectedMode !== 'all'}
          disabled={selectedMode === 'all'}
          maxLength={25650}
          rows={5}
          placeholder={'/pricing\n/products/*'}
          aria-describedby='widget-visibility-help'
        />
        <p
          id='widget-visibility-help'
          className='text-xs text-muted-foreground'
        >
          One path per line, up to 50. Use /pricing for one page or /products/*
          for that page and its subpages. Paths are case-sensitive. Trailing
          slashes, query strings, and fragments do not change matching. Saved
          changes apply when the website is next loaded.
        </p>
      </div>
    </section>
  )
}
