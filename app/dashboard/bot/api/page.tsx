import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table'
import { TrashIcon, CopyIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

export default function BotApiPage() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='dashboard-title'>API & Integrations</h1>
      </div>
      <div className='space-y-4 px-12 mt-12 max-w-4xl'>
        <h2 className='text-lg font-bold mb-4'>SETUP API</h2>
        <Button variant='default' className='text-xs px-2'>
          Generate API Key
        </Button>
        <div className='alert-muted italic'>No API Keys Created</div>
        <div className='bg-white p-2 rounded'>
          <h3 className='font-bold mb-4'>Your API Keys</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>My first API Key</TableCell>
                  <TableCell>12/08/2025</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='icon'
                          size='sm'
                          className='text-xs bg-red-500/20 hover:bg-red-500/30 rounded-full'>
                          <TrashIcon className='size-4 text-red-500' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side='right'>Revoke</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className='bg-white p-2 rounded'>
          <h3 className='font-bold mb-4'>Embeddable Code</h3>
          <div className='bg-gray-100 p-2 rounded'>
            <h4 className='font-bold mb-2'>Script</h4>
            <pre className='text-xs bg-white p-2 rounded'>
              <code className='flex justify-between gap-2 items-center'>
                <span>
                  &lt;script
                  src=&quot;https://api.your-domain.com/embed.js&quot;&gt;&lt;/script&gt;
                </span>
                <span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='icon'
                        size='icon-sm'
                        className='text-xs bg-gray-500/20 hover:bg-gray-500/30 rounded'>
                        <CopyIcon className='size-4 text-gray-500' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side='right'>Copy</TooltipContent>
                  </Tooltip>
                </span>
              </code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
