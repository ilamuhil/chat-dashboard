import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Mail,
  MessageCircle,
  Settings2,
  Wallet,
} from 'lucide-react'
import { ContactForm } from '@/components/marketing/contact-form'
import { contactEmail, siteUrl } from '@/lib/marketing/marketing'

export const metadata: Metadata = {
  title: 'Contact Us About Your Admissions Chatbot',
  description:
    'Talk to AI Chat Bot about student enquiry automation, admissions lead management, website installation, or plans for your college or institute.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Let’s talk about your next intake | AI Chat Bot',
    description:
      'Discuss your institute’s admissions chatbot, setup, pricing, or product questions.',
    url: '/contact',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact AI Chat Bot',
    description: 'Let’s talk about admissions conversations at your institute.',
    images: ['/opengraph-image'],
  },
}

export default function ContactPage() {
  const email = contactEmail()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact AI Chat Bot',
    url: `${siteUrl()}/contact`,
    description:
      'Product, setup, and pricing enquiries for the AI admissions chatbot.',
    mainEntity: {
      '@type': 'Organization',
      name: 'AI Chat Bot',
      url: siteUrl(),
      email,
      contactPoint: {
        '@type': 'ContactPoint',
        email,
        contactType: 'customer support',
      },
    },
  }
  return (
    <main id='main-content'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
        }}
      />
      <section className='contact-hero'>
        <div className='marketing-container'>
          <div className='contact-heading'>
            <p className='marketing-eyebrow'>Let’s start a conversation</p>
            <h1>
              Your institute is unique.
              <br />
              <span>Let’s talk about it.</span>
            </h1>
            <p>
              Exploring an AI admissions chatbot? Tell us about your students,
              your team, and what you’d like to make easier.
            </p>
          </div>
        </div>
      </section>
      <section className='contact-main' aria-label='Contact the team'>
        <div className='marketing-container contact-grid'>
          <aside className='contact-aside'>
            <h2>A useful conversation starts here.</h2>
            <p>
              Whether you’re comparing options or working through setup, give us
              a little context so we can help with the right next step.
            </p>
            <ul className='contact-topics'>
              <li>
                <GraduationCap size={21} aria-hidden='true' />
                <div>
                  <h3>Explore the fit for your institute</h3>
                  <p>
                    Talk about student enquiries, knowledge sources, lead
                    capture, and your counsellor workflow.
                  </p>
                </div>
              </li>
              <li>
                <Settings2 size={21} aria-hidden='true' />
                <div>
                  <h3>Get help with setup</h3>
                  <p>
                    Ask about training content, configuring your assistant, or
                    adding chat to your website.
                  </p>
                </div>
              </li>
              <li>
                <Wallet size={21} aria-hidden='true' />
                <div>
                  <h3>Find the right capacity</h3>
                  <p>
                    Discuss your bots, team size, expected enquiries, and the
                    plan allowances that matter.
                  </p>
                </div>
              </li>
            </ul>
            <div className='contact-email-block'>
              <span>Prefer a direct email?</span>
              <a href={`mailto:${email}`}>
                <Mail size={18} aria-hidden='true' />
                {email}
              </a>
            </div>
          </aside>
          <div className='contact-form-card'>
            <h2>Tell us what you have in mind.</h2>
            <p>Fields marked * are required. Your phone number isn’t needed.</p>
            <ContactForm email={email} />
          </div>
        </div>
      </section>
      <section className='contact-resources'>
        <div className='marketing-container'>
          <article className='contact-resource'>
            <BookOpen size={25} aria-hidden='true' />
            <div>
              <h2>Prefer to explore on your own?</h2>
              <p>
                Find practical guides for bot setup, knowledge training, and
                daily admissions work.
              </p>
              <Link href='/docs' className='marketing-text-link'>
                Visit the product guides{' '}
                <ArrowUpRight size={16} aria-hidden='true' />
              </Link>
            </div>
          </article>
          <article className='contact-resource'>
            <MessageCircle size={25} aria-hidden='true' />
            <div>
              <h2>Ready to try your own content?</h2>
              <p>
                Eligible accounts can test the student journey with a 14-day
                trial. No card required.
              </p>
              <Link href='/auth/signup' className='marketing-text-link'>
                Create your account{' '}
                <ArrowUpRight size={16} aria-hidden='true' />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
