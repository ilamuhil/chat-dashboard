import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, Info, Lightbulb, ArrowUpRight, MapPin, Users } from 'lucide-react'
import type { DocPage } from '@/lib/docs/docs'
import { docsPages } from '@/lib/docs/docs'
import { cn } from '@/lib/core/utils'

const tones = {
  info: { style: 'border-sky-200 bg-sky-50 text-sky-950', icon: Info },
  warning: { style: 'border-amber-200 bg-amber-50 text-amber-950', icon: CircleAlert },
  success: { style: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: Lightbulb },
}

export function DocsArticle({ page }: { page: DocPage }) {
  const index = docsPages.findIndex(item => item.slug === page.slug)
  const previous = index > 0 ? docsPages[index - 1] : null
  const next = index < docsPages.length - 1 ? docsPages[index + 1] : null

  return (
    <article className='min-w-0 flex-1 py-8 lg:py-12'>
      <header className='border-b border-slate-200 pb-8'>
        <p className='text-xs font-bold tracking-[0.14em] text-sky-700 uppercase'>{page.eyebrow}</p>
        <h1 className='mt-3 max-w-4xl text-3xl font-bold tracking-[-0.04em] text-balance text-slate-950 sm:text-4xl'>{page.title}</h1>
        <p className='mt-4 max-w-3xl text-base leading-7 text-slate-600'>{page.description}</p>
        {(page.menu || page.access) && (
          <dl className='mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm'>
            {page.menu && <div className='flex gap-3'><MapPin aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-sky-700' /><div><dt className='font-semibold text-slate-900'>Where to go</dt><dd className='mt-1 leading-6 text-slate-600'>{page.menu}</dd></div></div>}
            {page.access && <div className='flex gap-3'><Users aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-sky-700' /><div><dt className='font-semibold text-slate-900'>Who can do this</dt><dd className='mt-1 leading-6 text-slate-600'>{page.access}</dd></div></div>}
          </dl>
        )}
      </header>

      <nav aria-label='On this page' className='mt-6 rounded-xl border border-slate-200 p-4 sm:p-5'>
        <p className='text-xs font-bold tracking-wider text-slate-500 uppercase'>On this page</p>
        <ul className='mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2'>
          {page.sections.map(section => <li key={section.id}><a href={'#' + section.id} className='block text-sm leading-6 text-sky-800 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700'>{section.title}</a></li>)}
        </ul>
      </nav>

      <div className='min-w-0'>
        {page.sections.map(section => {
          const tone = section.note ? tones[section.note.tone || 'info'] : null
          const Icon = tone?.icon || Info
          return (
            <section key={section.id} id={section.id} className='scroll-mt-28 border-b border-slate-100 py-9 last:border-0'>
              <h2 className='text-xl font-semibold tracking-tight text-slate-950'>
                <a href={'#' + section.id} className='decoration-sky-300 underline-offset-4 hover:underline'>{section.title}</a>
              </h2>
              {section.paragraphs && <div className='mt-4 space-y-4 text-[15px] leading-7 text-slate-600'>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>}
              {section.steps && <ol className='mt-5 space-y-4'>{section.steps.map((step, stepIndex) => (
                <li key={step.title} className='grid grid-cols-[32px_minmax(0,1fr)] gap-3'>
                  <span className='mt-0.5 grid size-8 place-items-center rounded-full bg-slate-950 text-xs font-semibold text-white'>{stepIndex + 1}</span>
                  <div><h3 className='text-[15px] font-semibold leading-7 text-slate-900'>{step.title}</h3><p className='mt-1 text-sm leading-6 text-slate-600'>{step.description}</p></div>
                </li>
              ))}</ol>}
              {section.bullets && <ul className='mt-5 space-y-3'>{section.bullets.map(bullet => <li key={bullet} className='flex items-start gap-3 text-[15px] leading-7 text-slate-600'><CheckCircle2 aria-hidden='true' className='mt-1.5 size-4 shrink-0 text-sky-700' /><span>{bullet}</span></li>)}</ul>}
              {section.table && (
                <div role='region' aria-label={section.title + ' comparison'} tabIndex={0} className='mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700'>
                  <table className='w-full min-w-[32rem] border-collapse text-left text-sm'>
                    <caption className='sr-only'>{section.title}</caption>
                    <thead className='bg-slate-50 text-slate-900'><tr>{section.table.columns.map(column => <th key={column} scope='col' className='border-b border-slate-200 px-4 py-3 align-top font-semibold'>{column}</th>)}</tr></thead>
                    <tbody>{section.table.rows.map((row, rowIndex) => <tr key={row[0]} className={rowIndex % 2 ? 'bg-slate-50/50' : 'bg-white'}>{row.map((cell, cellIndex) => cellIndex === 0
                      ? <th key={cellIndex} scope='row' className='min-w-32 border-b border-slate-100 px-4 py-3 align-top font-medium leading-6 text-slate-900'>{cell}</th>
                      : <td key={cellIndex} className='border-b border-slate-100 px-4 py-3 align-top leading-6 text-slate-600'>{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
              {section.image && (
                <figure className='mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50'>
                  <a href={section.image.src} target='_blank' rel='noopener noreferrer' aria-label={'Enlarge: ' + section.image.alt} className='block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-500'>
                    <picture>
                      <source type='image/jpeg' srcSet={section.image.srcSet} sizes={'(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) calc(100vw - 4rem), ' + Math.min(880, section.image.displayWidth) + 'px'} />
                      <Image src={section.image.src} alt={section.image.alt} width={section.image.width} height={section.image.height} unoptimized loading='lazy' decoding='async' className='mx-auto h-auto w-full' style={{ maxWidth: section.image.displayWidth }} />
                    </picture>
                  </a>
                  <figcaption className='border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600'>
                    <div className='flex items-start justify-between gap-4'>
                      <p>{section.image.caption}</p>
                      <a href={section.image.src} target='_blank' rel='noopener noreferrer' aria-label={'Enlarge: ' + section.image.alt} className='inline-flex shrink-0 items-center gap-1 rounded-sm font-medium text-sky-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700'>Enlarge<ArrowUpRight aria-hidden='true' className='size-3' /></a>
                    </div>
                    <ol className='mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2'>
                      {section.image.callouts.map((callout, calloutIndex) => <li key={calloutIndex} className='flex items-start gap-2'><span aria-hidden='true' className='mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sky-800 text-[10px] font-semibold text-white'>{calloutIndex + 1}</span><span>{callout}</span></li>)}
                    </ol>
                  </figcaption>
                </figure>
              )}
              {section.code && <pre className='mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100'><code>{section.code}</code></pre>}
              {section.note && tone && <aside className={cn('mt-5 flex items-start gap-3 rounded-xl border p-4', tone.style)}><Icon aria-hidden='true' className='mt-0.5 size-4 shrink-0' /><div><p className='text-sm font-semibold'>{section.note.title}</p><p className='mt-1 text-sm leading-6'>{section.note.content}</p></div></aside>}
              {section.links && <div className='mt-5 grid gap-2 sm:grid-cols-2'>{section.links.map(link => <Link key={link.href} href={link.href} className='group flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-sky-800 transition-colors hover:border-sky-300 hover:bg-sky-50'><span>{link.label}</span><ArrowRight aria-hidden='true' className='mt-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5' /></Link>)}</div>}
            </section>
          )
        })}
      </div>

      <nav aria-label='Documentation pagination' className='mt-5 grid gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2'>
        {previous ? <Link href={previous.slug ? '/docs/' + previous.slug : '/docs'} className='group rounded-xl border border-slate-200 p-4 hover:border-sky-300'><span className='flex items-center gap-1.5 text-xs text-slate-500'><ArrowLeft aria-hidden='true' className='size-3.5' />Previous</span><span className='mt-2 block text-sm font-semibold text-slate-900 group-hover:text-sky-800'>{previous.title}</span></Link> : <span />}
        {next && <Link href={'/docs/' + next.slug} className='group rounded-xl border border-slate-200 p-4 text-right hover:border-sky-300'><span className='flex items-center justify-end gap-1.5 text-xs text-slate-500'>Next<ArrowRight aria-hidden='true' className='size-3.5' /></span><span className='mt-2 block text-sm font-semibold text-slate-900 group-hover:text-sky-800'>{next.title}</span></Link>}
      </nav>
    </article>
  )
}
