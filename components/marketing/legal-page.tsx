import Link from 'next/link'
import { ArrowLeft, Scale } from 'lucide-react'

export type LegalSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export function LegalPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
}: {
  eyebrow: string
  title: string
  summary: string
  effectiveDate: string
  sections: LegalSection[]
}) {
  return (
    <main className='bg-slate-50'>
      <section className='border-b border-slate-200 bg-white'>
        <div className='mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8'>
          <Link
            href='/'
            className='inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-sky-800'>
            <ArrowLeft className='size-4' aria-hidden='true' />
            Back to home
          </Link>
          <div className='mt-5 flex items-stretch gap-4'>
            <span className='grid w-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100'>
              <Scale className='size-5.5' aria-hidden='true' />
            </span>
            <div className='flex min-w-0 flex-col justify-between py-0.5'>
              <p className='text-xs leading-none font-bold tracking-[0.14em] text-sky-700 uppercase'>
                {eyebrow}
              </p>
              <h1 className='mt-2 text-3xl leading-none font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl'>
                {title}
              </h1>
            </div>
          </div>
          <p className='mt-6 max-w-3xl text-base leading-7 text-slate-600'>
            {summary}
          </p>
          <p className='mt-4 text-xs font-medium text-slate-500'>
            Effective date: {effectiveDate}
          </p>
        </div>
      </section>

      <div className='mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-16'>
        <aside className='hidden lg:block'>
          <nav
            aria-label={`${title} sections`}
            className='sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
            <p className='px-2 text-[11px] font-bold tracking-[0.13em] text-slate-500 uppercase'>
              On this page
            </p>
            <ul className='mt-3 space-y-0.5'>
              {sections.map(section => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className='block rounded-lg px-2 py-2 text-xs leading-5 text-slate-600 hover:bg-sky-50 hover:text-sky-800'>
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className='min-w-0 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm sm:px-8'>
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className='scroll-mt-24 border-b border-slate-100 py-7 last:border-0'>
              <h2 className='text-lg font-semibold tracking-[-0.02em] text-slate-950'>
                {index + 1}. {section.title}
              </h2>
              <div className='mt-4 space-y-4 text-sm leading-7 text-slate-600'>
                {section.paragraphs?.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className='space-y-2 pl-5'>
                    {section.bullets.map(bullet => (
                      <li key={bullet} className='list-disc pl-1'>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
