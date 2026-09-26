'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { GraduationCap, Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#workflow', label: 'How it works' },
  { href: '/docs', label: 'Docs' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className='sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl'>
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        <Link
          href='/'
          aria-label='AI Chat Bot home'
          className='group flex items-center gap-2.5'>
          <span className='grid size-9 place-items-center rounded-xl bg-linear-to-br from-sky-600 to-slate-900 text-white shadow-sm shadow-sky-900/20 transition-transform group-hover:-rotate-3'>
            <GraduationCap className='size-4.5' aria-hidden='true' />
          </span>
          <span className='leading-none'>
            <span className='block text-sm font-bold tracking-[-0.02em] text-slate-950'>
              AI Chat Bot
            </span>
            <span className='mt-1 block text-[10px] font-medium tracking-[0.08em] text-slate-500 uppercase'>
              Admissions intelligence
            </span>
          </span>
        </Link>

        <nav aria-label='Main navigation' className='hidden items-center gap-1 md:flex'>
          {links.map(link => {
            const active =
              link.href === '/docs'
                ? pathname.startsWith('/docs')
                : false
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sky-50 text-sky-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                )}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className='hidden items-center gap-2 md:flex'>
          <Button asChild variant='ghost' className='rounded-lg text-slate-600'>
            <Link href='/auth/login'>Log in</Link>
          </Button>
          <Button
            asChild
            className='rounded-lg bg-sky-700 px-4 text-white shadow-sm hover:bg-sky-800'>
            <Link href='/auth/signup'>Start free</Link>
          </Button>
        </div>

        <button
          type='button'
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
          className='grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700 md:hidden'>
          {open ? <X className='size-5' /> : <Menu className='size-5' />}
        </button>
      </div>

      {open && (
        <div className='border-t border-slate-100 bg-white px-4 py-4 shadow-lg md:hidden'>
          <nav aria-label='Mobile navigation' className='mx-auto grid max-w-7xl gap-1'>
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className='rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50'>
                {link.label}
              </Link>
            ))}
            <div className='mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4'>
              <Button asChild variant='outline' className='rounded-lg'>
                <Link href='/auth/login' onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild className='rounded-lg bg-sky-700 hover:bg-sky-800'>
                <Link href='/auth/signup' onClick={() => setOpen(false)}>
                  Start free
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
