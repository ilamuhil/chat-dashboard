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

const EMBED_SCRIPT =
  '<script src="https://api.your-domain.com/embed.js"></script>'

const CodeBlock = () => {
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(EMBED_SCRIPT)
    toast.success('Copied to clipboard')
  }, [])

  return (
    <div className='flex items-center gap-3 rounded-md border border-slate-200 bg-slate-950 px-3 py-2.5 text-slate-100'>
      <code className='min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-relaxed whitespace-nowrap'>
        <span className='text-slate-400'>&lt;</span>
        <span className='text-sky-300'>script</span>
        <span className='text-slate-400'> </span>
        <span className='text-emerald-300'>src</span>
        <span className='text-slate-400'>=</span>
        <span className='text-amber-200'>
          &quot;https://api.your-domain.com/embed.js&quot;
        </span>
        <span className='text-slate-400'>&gt;&lt;/</span>
        <span className='text-sky-300'>script</span>
        <span className='text-slate-400'>&gt;</span>
      </code>
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
