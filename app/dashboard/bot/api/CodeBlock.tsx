'use client'
import React, { useCallback } from 'react'
import { Tooltip } from '@/components/ui/tooltip'
import { TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { CopyIcon } from 'lucide-react'
import { TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'

const CodeBlock = () => {
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(
      '<script src="https://api.your-domain.com/embed.js"></script>'
    )
    toast.success('Copied to clipboard')
  }, [])
  return (
    <code className='flex justify-between gap-2 items-center'>
      <span>
        &lt;script
        src=&quot;https://api.your-domain.com/embed.js&quot;&gt;&lt;/script&gt;
      </span>
      <span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon-sm'
              className='text-xs bg-gray-500/20 hover:bg-gray-500/30 rounded'
              onClick={copyToClipboard}>
              <CopyIcon className='size-4 text-gray-500' />
            </Button>
          </TooltipTrigger>
          <TooltipContent side='right'>Copy</TooltipContent>
        </Tooltip>
      </span>
    </code>
  )
}

export default CodeBlock
