import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
  Lightbulb,
} from 'lucide-react'

import type { DocPage } from '@/lib/docs'
import { docsPages } from '@/lib/docs'
import { cn } from '@/lib/utils'

const toneClasses = {
  info: 'border-sky-200 bg-sky-50 text-sky-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
}

const toneIcons = {
  info: Info,
  warning: CircleAlert,
  success: Lightbulb,
}

export function DocsArticle({ page }: { page: DocPage }) {
  const index = docsPages.findIndex(item => item.slug === page.slug)
  const previous = index > 0 ? docsPages[index - 1] : null
  const next = index < docsPages.length - 1 ? docsPages[index + 1] : null

  return (
    <article className='min-w-0 flex-1 py-10 lg:py-12'>
      <header className='border-b border-slate-200 pb-9'>
        <p className='text-xs font-bold tracking-[0.14em] text-sky-700 uppercase'>
          {page.eyebrow}
        </p>
        <h1 className='mt-3 max-w-4xl text-3xl font-bold tracking-[-0.04em] text-balance text-slate-950 sm:text-4xl'>
          {page.title}
        </h1>
        <p className='mt-4 max-w-3xl text-base leading-7 text-slate-600'>
          {page.description}
        </p>
      </header>

      <div className='max-w-3xl'>
        {page.sections.map(section => (
          <section
            key={section.id}
            id={section.id}
            className='scroll-mt-32 border-b border-slate-100 py-9 last:border-0'>
            <h2 className='text-xl font-semibold tracking-tight text-slate-950'>
              {section.title}
            </h2>

            {section.paragraphs && (
              <div className='mt-4 space-y-4 text-[15px] leading-7 text-slate-600'>
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}

            {section.bullets && (
              <ul className='mt-5 space-y-3'>
                {section.bullets.map(bullet => (
                  <li
                    key={bullet}
                    className='flex items-start gap-3 text-[15px] leading-7 text-slate-600'>
                    <CheckCircle2
                      className='mt-1.5 size-4 shrink-0 text-sky-700'
                      aria-hidden='true'
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.steps && (
              <ol className='mt-6 space-y-4'>
                {section.steps.map((step, stepIndex) => (
                  <li
                    key={step.title}
                    className='grid grid-cols-[36px_minmax(0,1fr)] gap-3'>
                    <span className='grid size-9 place-items-center rounded-full bg-slate-950 font-mono text-xs font-semibold text-white'>
                      {stepIndex + 1}
                    </span>
                    <div className='rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3'>
                      <h3 className='text-sm font-semibold text-slate-950'>
                        {step.title}
                      </h3>
                      <p className='mt-1 text-sm leading-6 text-slate-600'>
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {section.code && (
              <pre className='mt-6 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100 shadow-sm'>
                <code>{section.code}</code>
              </pre>
            )}

            {section.note && (() => {
              const tone = section.note.tone || 'info'
              const Icon = toneIcons[tone]
              return (
                <aside
                  className={cn(
                    'mt-6 flex items-start gap-3 rounded-xl border p-4',
                    toneClasses[tone],
                  )}>
                  <Icon className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
                  <div>
                    <p className='text-sm font-semibold'>{section.note.title}</p>
                    <p className='mt-1 text-sm leading-6 opacity-80'>
                      {section.note.content}
                    </p>
                  </div>
                </aside>
              )
            })()}
          </section>
        ))}
      </div>

      <nav
        aria-label='Documentation pagination'
        className='mt-5 grid gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2'>
        {previous ? (
          <Link
            href={previous.slug ? `/docs/${previous.slug}` : '/docs'}
            className='group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:shadow-md'>
            <span className='flex items-center gap-1.5 text-xs font-medium text-slate-500'>
              <ArrowLeft className='size-3.5' aria-hidden='true' />
              Previous
            </span>
            <span className='mt-2 block text-sm font-semibold text-slate-900 group-hover:text-sky-800'>
              {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/docs/${next.slug}`}
            className='group rounded-xl border border-slate-200 bg-white p-4 text-right transition hover:border-sky-200 hover:shadow-md'>
            <span className='flex items-center justify-end gap-1.5 text-xs font-medium text-slate-500'>
              Next
              <ArrowRight className='size-3.5' aria-hidden='true' />
            </span>
            <span className='mt-2 block text-sm font-semibold text-slate-900 group-hover:text-sky-800'>
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  )
}
