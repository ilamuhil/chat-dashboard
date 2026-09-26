import Link from 'next/link'
import { GraduationCap, Mail } from 'lucide-react'

const productLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/#workflow', label: 'How it works' },
  { href: '/docs', label: 'Documentation' },
]

const legalLinks = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
]

export function SiteFooter() {
  return (
    <footer className='border-t border-slate-200 bg-slate-950 text-slate-300'>
      <div className='mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8'>
        <div className='max-w-md'>
          <Link href='/' className='inline-flex items-center gap-2.5 text-white'>
            <span className='grid size-9 place-items-center rounded-xl bg-sky-600'>
              <GraduationCap className='size-4.5' aria-hidden='true' />
            </span>
            <span className='font-semibold'>AI Chat Bot</span>
          </Link>
          <p className='mt-4 text-sm leading-6 text-slate-400'>
            An AI admissions chatbot and lead-management workspace for academic
            institutes that want to answer student enquiries and move promising
            applicants toward a human counsellor.
          </p>
          <a
            href='mailto:support@aichatbot.example'
            className='mt-5 inline-flex items-center gap-2 text-sm text-sky-300 hover:text-sky-200'>
            <Mail className='size-4' aria-hidden='true' />
            support@aichatbot.example
          </a>
        </div>

        <div>
          <h2 className='text-xs font-semibold tracking-[0.14em] text-white uppercase'>
            Product
          </h2>
          <ul className='mt-4 space-y-3'>
            {productLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='text-sm text-slate-400 hover:text-white'>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className='text-xs font-semibold tracking-[0.14em] text-white uppercase'>
            Legal
          </h2>
          <ul className='mt-4 space-y-3'>
            {legalLinks.map(link => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className='text-sm text-slate-400 hover:text-white'>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className='border-t border-white/10'>
        <div className='mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8'>
          <span>© {new Date().getFullYear()} AI Chat Bot. All rights reserved.</span>
          <span>Built for responsible admissions conversations.</span>
        </div>
      </div>
    </footer>
  )
}
