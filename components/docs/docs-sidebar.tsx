'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { BookOpen, ChevronDown, Search } from 'lucide-react'
import type { DocPage } from '@/lib/docs/docs'

type NavigationItem = { href: string; label: string; description: string; category: DocPage['category'] }
import { cn } from '@/lib/core/utils'

const categories = ['Start here', 'Configure', 'Operate', 'Account & limits'] as const

export function DocsSidebar({ navigation }: { navigation: NavigationItem[] }) {
  const pathname = usePathname()
  const mobileMenuRef = useRef<HTMLDetailsElement>(null)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visible = navigation.filter(item => (item.label + ' ' + item.description).toLowerCase().includes(normalizedQuery))

  const guideList = (mobile: boolean) => (
    <>
      <label className='relative mb-5 block'>
        <span className='sr-only'>Find a documentation guide</span>
        <Search aria-hidden='true' className='pointer-events-none absolute top-3 left-3 size-3.5 text-slate-400' />
        <input type='search' value={query} onChange={event => setQuery(event.target.value)} placeholder='Find a guide…' className='h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-9 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100' />
      </label>
      <nav aria-label={mobile ? 'Mobile documentation' : 'Documentation'}>
        {categories.map(category => {
          const links = visible.filter(item => item.category === category)
          if (!links.length) return null
          return (
            <div key={category} className='mb-5 last:mb-0'>
              <p className='mb-2 px-3 text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase'>{category}</p>
              <ul className={cn('gap-0.5', mobile ? 'grid sm:grid-cols-2' : 'space-y-0.5')}>
                {links.map(item => <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? 'page' : undefined}
                  onClick={() => { if (mobile && mobileMenuRef.current) mobileMenuRef.current.open = false }}
                  className={cn('block rounded-lg border-l-2 px-3 py-2 text-[13px] leading-5 transition-colors', pathname === item.href ? 'border-sky-600 bg-sky-50 font-semibold text-sky-900' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950')}>
                  {item.label}
                </Link></li>)}
              </ul>
            </div>
          )
        })}
        {!visible.length && <p role='status' className='px-3 py-2 text-sm leading-6 text-slate-500'>No matching guide. Try “storage”, “billing”, or “training”.</p>}
      </nav>
    </>
  )

  return (
    <>
      <aside className='hidden w-60 shrink-0 lg:block'>
        <div className='sticky top-20 max-h-[calc(100svh-6rem)] overflow-y-auto py-8 pr-4'>
          <Link href='/docs' className='mb-5 flex items-center gap-2 px-3'>
            <span className='grid size-8 place-items-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100'><BookOpen aria-hidden='true' className='size-4' /></span>
            <span><span className='block text-sm font-semibold text-slate-950'>Product handbook</span><span className='block text-[11px] text-slate-500'>Setup, operation, and account help</span></span>
          </Link>
          {guideList(false)}
        </div>
      </aside>
      <details ref={mobileMenuRef} className='group sticky top-16 z-30 -mx-4 border-y border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden'>
        <summary className='flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900'>
          <span className='flex items-center gap-2'><BookOpen aria-hidden='true' className='size-4 text-sky-700' />Documentation menu</span>
          <ChevronDown aria-hidden='true' className='size-4 text-slate-500 transition group-open:rotate-180' />
        </summary>
        <div className='mt-4 max-h-[65svh] overflow-y-auto pb-2'>{guideList(true)}</div>
      </details>
    </>
  )
}
