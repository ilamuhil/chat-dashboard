import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Check,
  CircleCheck,
  FileSearch,
  GraduationCap,
  Handshake,
  Languages,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRoundCheck,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'

const siteUrl = (
  process.env.APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:4000'
).replace(/\/$/, '')

export const metadata: Metadata = {
  title: 'AI Admissions Chatbot & Lead Management for Institutes',
  description:
    'Answer student enquiries around the clock, capture admissions leads, and connect applicants with counsellors using an AI admissions chatbot grounded in your institute content.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'AI Admissions Chatbot for Academic Institutes',
    description:
      'Turn student questions into informed admissions conversations and counsellor-ready leads.',
    url: '/',
    images: [
      {
        url: '/marketing/admissions-ai-hero.png',
        width: 1536,
        height: 864,
        alt: 'AI admissions chatbot and student enquiry workflow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Admissions Chatbot for Academic Institutes',
    description:
      'Grounded student answers, lead capture, and human counsellor handoff in one workspace.',
    images: ['/marketing/admissions-ai-hero.png'],
  },
}

const features = [
  {
    icon: FileSearch,
    title: 'Answers grounded in your institute',
    description:
      'Use approved program, eligibility, fee, scholarship, policy, and application content instead of generic guesses.',
  },
  {
    icon: UserRoundCheck,
    title: 'Natural admissions lead capture',
    description:
      'Collect a prospective student’s name, email, and phone at the right point in the conversation.',
  },
  {
    icon: Handshake,
    title: 'Human counsellor handoff',
    description:
      'Let students request a counsellor and notify your team when a conversation needs a person.',
  },
  {
    icon: MessageSquareText,
    title: 'Live conversation workspace',
    description:
      'Review enquiries, join active chats, share clear responses, and keep the student journey moving.',
  },
  {
    icon: Languages,
    title: 'Student-friendly communication',
    description:
      'Configure tone and persona, with practical multilingual replies when the conversation calls for them.',
  },
  {
    icon: Users,
    title: 'Admin and editor collaboration',
    description:
      'Invite teammates, assign roles, manage organization access, and keep admissions work shared.',
  },
]

const workflow = [
  {
    step: '01',
    title: 'Add institute knowledge',
    description:
      'Upload prospectuses and admissions material or add website pages.',
  },
  {
    step: '02',
    title: 'Shape your admissions assistant',
    description:
      'Choose its name, tone, role, greeting, and lead-capture behaviour.',
  },
  {
    step: '03',
    title: 'Embed it on your website',
    description:
      'Create a bot-specific key and add the chat experience to your site.',
  },
  {
    step: '04',
    title: 'Guide and qualify enquiries',
    description:
      'Answer questions, capture contact details, and route high-intent students to counsellors.',
  },
]

const faqs = [
  {
    question: 'What is an AI admissions chatbot?',
    answer:
      'An AI admissions chatbot helps prospective students find institute-specific information about programs, eligibility, fees, scholarships, schedules, application steps, and related policies. AI Chat Bot uses approved institute content and can route a student to a human counsellor when the answer needs confirmation.',
  },
  {
    question: 'Can the chatbot capture admissions leads?',
    answer:
      'Yes. You can configure the chatbot to collect a student’s name, email address, and phone number naturally during the enquiry. Your team can then review captured leads and their conversation context from the dashboard.',
  },
  {
    question: 'Which knowledge formats can I use?',
    answer:
      'The knowledge workflow supports PDF, TXT, Markdown, CSV, and DOC/DOCX files. HTML content is ingested by adding the relevant public website URL.',
  },
  {
    question: 'Can a counsellor take over an AI conversation?',
    answer:
      'Yes. Students can ask for a human counsellor, your organization can receive a handoff notification, and an available team member can join the conversation.',
  },
  {
    question: 'Does the chatbot guarantee that every answer is correct?',
    answer:
      'No AI system can guarantee every response. The assistant is designed to use approved institute information, avoid unsupported guarantees, and offer a counsellor handoff when information is missing, ambiguous, or conflicting.',
  },
]

export default function MarketingHomePage() {
  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Chat Bot',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteUrl,
    description:
      'AI admissions chatbot and admissions lead-management workspace for academic institutes.',
    featureList: [
      'Institute-grounded admissions answers',
      'Student enquiry lead capture',
      'Human counsellor handoff',
      'Website chatbot embedding',
      'Conversation management',
      'Organization roles',
    ],
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <main>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className='relative overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,transparent_38%),linear-gradient(to_bottom,#fff,#f8fafc)]'>
        <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-size-[32px_32px] mask-[linear-gradient(to_bottom,black,transparent_85%)]' />
        <div className='relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-28'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm'>
              <Sparkles className='size-3.5' aria-hidden='true' />
              Admissions conversations that move students forward
            </div>
            <h1 className='mt-6 max-w-3xl text-4xl font-bold tracking-[-0.045em] text-balance text-slate-950 sm:text-5xl lg:text-[64px] lg:leading-[1.02]'>
              An AI admissions chatbot built for{' '}
              <span className='bg-linear-to-r from-sky-700 to-teal-600 bg-clip-text text-transparent'>
                academic institutes
              </span>
            </h1>
            <p className='mt-6 max-w-2xl text-lg leading-8 text-slate-600'>
              Give prospective students clear answers from your approved
              content, capture high-intent enquiries, and connect the right
              applicants with your admissions counsellors.
            </p>
            <div className='mt-8 flex flex-col gap-3 sm:flex-row'>
              <Button
                asChild
                size='lg'
                className='h-12 rounded-xl bg-sky-700 px-6 text-white shadow-lg shadow-sky-900/15 hover:bg-sky-800'>
                <Link href='/auth/signup'>
                  Build your admissions bot
                  <ArrowRight className='ml-2 size-4' aria-hidden='true' />
                </Link>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='h-12 rounded-xl border-slate-300 bg-white/80 px-6'>
                <Link href='/docs'>Explore the documentation</Link>
              </Button>
            </div>
            <ul className='mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600'>
              {['No-code setup', 'Grounded responses', 'Human handoff'].map(
                item => (
                  <li key={item} className='flex items-center gap-1.5'>
                    <CircleCheck
                      className='size-4 text-emerald-600'
                      aria-hidden='true'
                    />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className='relative'>
            <div className='overflow-hidden rounded-4xl border border-white/80 bg-white p-2 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200/70'>
              <Image
                src='/marketing/admissions-ai-hero.png'
                alt='AI admissions chatbot helping an institute manage student enquiries'
                width={1536}
                height={864}
                priority
                className='aspect-video w-full rounded-[1.55rem] object-cover'
              />
            </div>
            <div className='absolute -bottom-6 left-3 max-w-60 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:left-8'>
              <div className='flex items-center gap-3'>
                <span className='grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700'>
                  <UserRoundCheck className='size-4' aria-hidden='true' />
                </span>
                <div>
                  <p className='text-xs font-semibold text-slate-900'>
                    Enquiry captured
                  </p>
                  <p className='mt-0.5 text-[11px] text-slate-500'>
                    Ready for counsellor follow-up
                  </p>
                </div>
              </div>
            </div>
            <div className='absolute -top-5 right-3 hidden rounded-2xl border border-sky-200 bg-sky-950 px-4 py-3 text-white shadow-xl sm:block'>
              <div className='flex items-center gap-2'>
                <BellRing className='size-4 text-sky-300' aria-hidden='true' />
                <span className='text-xs font-medium'>Counsellor requested</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='border-y border-slate-200/70 bg-white'>
        <div className='mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8'>
          {[
            ['Always available', 'Answer common student questions beyond office hours.'],
            ['Institute grounded', 'Retrieve answers from the sources your team approves.'],
            ['Counsellor connected', 'Move complex or high-intent enquiries to a person.'],
          ].map(([title, copy]) => (
            <div key={title} className='flex items-start gap-3'>
              <Check
                className='mt-0.5 size-4 shrink-0 text-sky-700'
                aria-hidden='true'
              />
              <div>
                <p className='text-sm font-semibold text-slate-900'>{title}</p>
                <p className='mt-1 text-xs leading-5 text-slate-500'>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id='features' className='scroll-mt-24 bg-white py-20 sm:py-24'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='max-w-3xl'>
            <p className='text-xs font-bold tracking-[0.16em] text-sky-700 uppercase'>
              Admissions automation with a human path
            </p>
            <h2 className='mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl'>
              Help every student get a useful next step
            </h2>
            <p className='mt-4 text-base leading-7 text-slate-600'>
              Handle routine enquiries with AI while keeping your admissions
              team visible, informed, and ready to step in.
            </p>
          </div>
          <div className='mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
            {features.map(feature => (
              <article
                key={feature.title}
                className='group rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50/70 p-6 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-900/5'>
                <span className='grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100 transition group-hover:bg-sky-700 group-hover:text-white'>
                  <feature.icon className='size-5' aria-hidden='true' />
                </span>
                <h3 className='mt-5 text-base font-semibold text-slate-950'>
                  {feature.title}
                </h3>
                <p className='mt-2 text-sm leading-6 text-slate-600'>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id='workflow'
        className='scroll-mt-24 overflow-hidden bg-slate-950 py-20 text-white sm:py-24'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end'>
            <div>
              <p className='text-xs font-bold tracking-[0.16em] text-sky-300 uppercase'>
                From content to conversations
              </p>
              <h2 className='mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl'>
                Launch an admissions assistant without rebuilding your website
              </h2>
            </div>
            <p className='max-w-2xl text-base leading-7 text-slate-300 lg:justify-self-end'>
              Bring your institute knowledge together, configure the student
              experience, and give counsellors context when an enquiry becomes
              a serious admissions opportunity.
            </p>
          </div>

          <div className='mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4'>
            {workflow.map(item => (
              <article key={item.step} className='bg-slate-950 p-6'>
                <span className='font-mono text-xs font-semibold text-sky-300'>
                  {item.step}
                </span>
                <h3 className='mt-8 text-base font-semibold'>{item.title}</h3>
                <p className='mt-2 text-sm leading-6 text-slate-400'>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className='bg-slate-50 py-20 sm:py-24'>
        <div className='mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8'>
          <div className='rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8'>
            <div className='flex items-center justify-between border-b border-slate-100 pb-5'>
              <div>
                <p className='text-sm font-semibold text-slate-950'>
                  Institute knowledge
                </p>
                <p className='mt-1 text-xs text-slate-500'>
                  Sources used for grounded answers
                </p>
              </div>
              <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700'>
                Trained
              </span>
            </div>
            <div className='mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3'>
              {['PDF', 'DOCX', 'Markdown', 'TXT', 'CSV', 'Website URL'].map(
                format => (
                  <div
                    key={format}
                    className='flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold text-slate-700'>
                    <UploadCloud
                      className='size-3.5 text-sky-700'
                      aria-hidden='true'
                    />
                    {format}
                  </div>
                ),
              )}
            </div>
            <div className='mt-5 rounded-xl bg-sky-50 p-4 text-xs leading-5 text-sky-900'>
              HTML content is collected from the public website pages you add as
              URL sources.
            </div>
          </div>

          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-sky-700 uppercase'>
              A knowledge layer for admissions
            </p>
            <h2 className='mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl'>
              Put approved institute information behind every answer
            </h2>
            <p className='mt-5 text-base leading-7 text-slate-600'>
              Train each bot with the sources relevant to its institute or
              program. The admissions assistant retrieves matching information
              before responding and offers a counsellor when details are absent
              or conflicting.
            </p>
            <ul className='mt-7 space-y-3'>
              {[
                'Program, eligibility, fee, and scholarship guidance',
                'Application steps, schedules, modes, and locations',
                'No unsupported admission, placement, or outcome guarantees',
              ].map(item => (
                <li
                  key={item}
                  className='flex items-start gap-3 text-sm leading-6 text-slate-700'>
                  <ShieldCheck
                    className='mt-0.5 size-4 shrink-0 text-emerald-600'
                    aria-hidden='true'
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href='/docs/institute-knowledge'
              className='mt-7 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900'>
              Learn about training data
              <ArrowRight className='size-4' aria-hidden='true' />
            </Link>
          </div>
        </div>
      </section>

      <section className='bg-white py-20 sm:py-24'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='rounded-4xl bg-linear-to-br from-sky-700 via-sky-800 to-slate-950 px-6 py-12 text-white shadow-2xl shadow-sky-900/15 sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14'>
            <div className='max-w-2xl'>
              <div className='flex items-center gap-2 text-sky-200'>
                <GraduationCap className='size-5' aria-hidden='true' />
                <span className='text-xs font-bold tracking-[0.14em] uppercase'>
                  Built for admissions teams
                </span>
              </div>
              <h2 className='mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-4xl'>
                Turn more student questions into informed conversations
              </h2>
              <p className='mt-4 text-base leading-7 text-sky-100/85'>
                Start with one bot, add your institute knowledge, and create a
                clearer path from first enquiry to counsellor follow-up.
              </p>
            </div>
            <div className='mt-8 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0 lg:ml-10'>
              <Button
                asChild
                size='lg'
                className='h-12 rounded-xl bg-white px-6 text-sky-900 hover:bg-sky-50'>
                <Link href='/auth/signup'>Start building</Link>
              </Button>
              <Button
                asChild
                size='lg'
                variant='outline'
                className='h-12 rounded-xl border-white/25 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white'>
                <Link href='/docs/admissions-chatbot-setup'>Read setup guide</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id='faq' className='scroll-mt-24 bg-slate-50 py-20 sm:py-24'>
        <div className='mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8'>
          <div>
            <p className='text-xs font-bold tracking-[0.16em] text-sky-700 uppercase'>
              Questions from admissions teams
            </p>
            <h2 className='mt-4 text-3xl font-bold tracking-[-0.035em] text-slate-950'>
              What to know before you begin
            </h2>
            <p className='mt-4 text-sm leading-6 text-slate-600'>
              For setup instructions and product details, visit the complete
              documentation.
            </p>
            <Button asChild variant='outline' className='mt-6 rounded-lg bg-white'>
              <Link href='/docs'>Browse all docs</Link>
            </Button>
          </div>
          <div className='divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm sm:px-7'>
            {faqs.map(item => (
              <details key={item.question} className='group py-5'>
                <summary className='flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-950'>
                  {item.question}
                  <span className='grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500'>
                    <Plus
                      className='size-3.5 transition-transform group-open:rotate-45'
                      aria-hidden='true'
                    />
                  </span>
                </summary>
                <p className='mt-3 max-w-3xl pr-8 text-sm leading-6 text-slate-600'>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
