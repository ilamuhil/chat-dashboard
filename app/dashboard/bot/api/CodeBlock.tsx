'use client'

import React, { useCallback } from 'react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'

const EMBED_SCRIPT = `<script
  src="https://api.your-domain.com/embed.js"
  data-api-key="YOUR_API_KEY"
  async
></script>`

const CodeBlock = () => {
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(EMBED_SCRIPT)
    toast.success('Copied to clipboard')
  }, [])

  return (
    <div className='flex items-start gap-3 rounded-md border border-slate-200 bg-slate-950 px-3 py-2.5 text-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-950'>
      <pre className='min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-5 text-slate-200'>
        <code>
          <span className='text-slate-500'>&lt;script</span>
          {'\n'}
          {'  '}
          <span className='text-sky-300'>src</span>
          <span className='text-slate-500'>=</span>
          <span className='text-amber-200'>
            &quot;https://api.your-domain.com/embed.js&quot;
          </span>
          {'\n'}
          {'  '}
          <span className='text-emerald-300'>data-api-key</span>
          <span className='text-slate-500'>=</span>
          <span className='text-amber-200'>&quot;YOUR_API_KEY&quot;</span>
          {'\n'}
          {'  '}
          <span className='text-emerald-300'>async</span>
          {'\n'}
          <span className='text-slate-500'>&gt;&lt;/script&gt;</span>
        </code>
      </pre>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8 shrink-0 rounded-md bg-white/10 text-slate-200 hover:bg-white/15 hover:text-white'
            onClick={copyToClipboard}>
            <CopyIcon className='size-3.5' />
          </Button>
        </TooltipTrigger>
        <TooltipContent side='left'>Copy</TooltipContent>
      </Tooltip>
    </div>
  )
}

export default CodeBlock
