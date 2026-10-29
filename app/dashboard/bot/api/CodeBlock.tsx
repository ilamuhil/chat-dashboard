'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { buildWidgetEmbed } from '@/lib/widget-embed'

export default function CodeBlock({
  widgetUrl,
}: {
  widgetUrl: string
}) {
  const [url, setUrl] = useState(widgetUrl)
  const [apiKey, setApiKey] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const snippet = buildWidgetEmbed({
    url: url.trim() || 'YOUR_PUBLISHED_WIDGET_SCRIPT_URL',
    apiKey: apiKey.trim() || 'YOUR_BOT_WIDGET_KEY',
    theme,
  })
  let validUrl = false
  try {
    const parsed = new URL(url)
    validUrl = ['https:', 'http:'].includes(parsed.protocol)
  } catch {
    /* User is still entering a URL. */
  }
  const canCopy = validUrl && Boolean(apiKey.trim())
  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        <div className='space-y-1.5 md:col-span-2'>
          <Label htmlFor='widget-script-url'>Published widget script URL</Label>
          <Input
            id='widget-script-url'
            type='url'
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder='https://your-cdn.example/chat-widget-ui.iife.js'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='widget-embed-theme'>Widget theme</Label>
          <select
            id='widget-embed-theme'
            value={theme}
            onChange={(event) =>
              setTheme(event.target.value as 'light' | 'dark')
            }
            className='h-9 w-full rounded-md border border-input bg-background px-3 text-sm'
          >
            <option value='light'>Light</option>
            <option value='dark'>Dark</option>
          </select>
        </div>
        <div className='space-y-1.5 md:col-span-2'>
          <Label htmlFor='widget-embed-key'>Widget API key for this bot</Label>
          <Input
            id='widget-embed-key'
            value={apiKey}
            autoComplete='off'
            onChange={(event) => setApiKey(event.target.value)}
            placeholder='Paste the key saved when it was generated'
            aria-describedby='widget-embed-key-help'
          />
          <p
            id='widget-embed-key-help'
            className='text-xs text-muted-foreground'
          >
            Use the website key generated for the bot you want to install. Saved keys cannot be retrieved;
            generate a new key if needed.
          </p>
        </div>
      </div>
      <pre className='overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100'>
        <code>{snippet}</code>
      </pre>
      <Button
        type='button'
        disabled={!canCopy}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet)
            toast.success('Copied to clipboard')
          } catch {
            toast.error('Could not copy. Select and copy the script above.')
          }
        }}
      >
        Copy embed code
      </Button>
      <p className='text-xs text-muted-foreground'>
        Paste once into your website’s head. React and styles are included.
        Route visibility is managed in Bot Configuration → Interactions.
      </p>
    </div>
  )
}
