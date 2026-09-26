'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'

import { docsNav } from '@/lib/docs'
import { cn } from '@/lib/utils'

export function DocsSidebar() {
  const pathname = usePathname()
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)

  return (
    <>
      <aside className='hidden w-64 shrink-0 lg:block'>
        <div className='sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto py-8 pr-5'>
          <div className='mb-5 flex items-center gap-2 px-3'>
            <span className='grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100'>
              <BookOpen className='size-4' aria-hidden='true' />
            </span>
            <div>
              <p className='text-sm font-semibold text-slate-950'>Documentation</p>
              <p className='text-[11px] text-slate-500'>Admissions chatbot guide</p>
            </div>
          </div>
          <nav aria-label='Documentation'>
            <ul className='space-y-0.5'>
              {docsNav.map(link => {
                const active = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-lg border-l-2 px-3 py-2 text-sm transition-colors',
                        active
                          ? 'border-sky-600 bg-sky-50 font-semibold text-sky-900'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                      )}>
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <details
        ref={mobileMenuRef}
        className='group sticky top-16 z-30 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden'>
        <summary className='flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900'>
          <span className='flex items-center gap-2'>
            <BookOpen className='size-4 text-sky-700' aria-hidden='true' />
            Documentation menu
          </span>
          <ChevronDown
            className='size-4 text-slate-500 transition group-open:rotate-180'
            aria-hidden='true'
          />
        </summary>
        <nav aria-label='Mobile documentation' className='mt-3'>
          <ul className='grid gap-1 border-t border-slate-100 pt-3 sm:grid-cols-2'>
            {docsNav.map(link => {
              const active = pathname === link.href
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      if (mobileMenuRef.current) {
                        mobileMenuRef.current.open = false
                      }
                    }}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-sm',
                      active
                        ? 'bg-sky-50 font-semibold text-sky-900'
                        : 'text-slate-600 hover:bg-slate-50',
                    )}>
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </details>
    </>
  )
}
