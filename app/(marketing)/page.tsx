import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  ListChecks,
  MessageCircle,
  Palette,
  ShieldCheck,
  Users,
  UserRoundCheck,
} from 'lucide-react'
import { ProductDemo } from '@/components/marketing/product-demo'
import { admissionsFaqs, siteUrl } from '@/lib/marketing/marketing'

export const metadata: Metadata = {
  title: 'AI Admissions Chatbot for Colleges & Institutes',
  description:
    'Answer student enquiries with your institute’s knowledge, capture admissions leads, and connect students with counsellors. Try AI Chat Bot free for 14 days.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Better admissions conversations. Better next steps.',
    description:
      'An AI admissions chatbot, student lead management, and human counsellor handoff in one workspace.',
    url: '/',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'AI Chat Bot — admissions conversations that move students forward',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Admissions Chatbot for Colleges & Institutes',
    description:
      'Your institute’s knowledge. Your team’s next admissions conversation.',
    images: ['/opengraph-image'],
  },
}

const capabilities = [
  {
    icon: Palette,
    title: 'An assistant that feels like you',
    copy: 'Set its name, avatar, greeting, tone, and institute context. Choose light or dark styling for the website widget.',
    href: '/docs/chatbot-customization',
  },
  {
    icon: Languages,
    title: 'More approachable conversations',
    copy: 'Support student conversations in their preferred language when practical. Test the languages your audience uses before launch.',
    href: '/docs/markdown-responses',
  },
  {
    icon: Clock3,
    title: 'Clear support expectations',
    copy: 'Show your team’s support hours, time zone, reply estimate, email, and help link right in the chat experience.',
    href: '/docs/chatbot-customization#support-settings',
  },
  {
    icon: Users,
    title: 'A shared admissions workspace',
    copy: 'Invite colleagues, manage Owner, Admin, Counsellor and Viewer roles, and keep bots, enquiries, and conversations in the right organization.',
    href: '/docs/team-roles',
  },
  {
    icon: ListChecks,
    title: 'Follow-ups with an owner',
    copy: 'Record the next action, assign responsibility, track its status, and keep notes with the student enquiry.',
    href: '/docs/leads-and-follow-ups',
  },
  {
    icon: ShieldCheck,
    title: 'Visibility into your capacity',
    copy: 'Review AI replies, training sources, storage, and team allowances. Export records your organization needs to keep.',
    href: '/docs/storage-and-limits',
  },
]

export default function MarketingHomePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'AI Chat Bot',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl(),
        description:
          'AI admissions chatbot, student enquiry management, and counsellor handoff for colleges and academic institutes.',
        featureList: [
          'Answers from institute knowledge',
          'Configurable student lead capture',
          'Human counsellor handoff',
          'Conversation history and summaries',
          'Lead follow-up tracking',
          'Embeddable website chat widget',
          'Organization roles and team collaboration',
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: admissionsFaqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  }

  return (
    <main id='main-content' className='marketing-home'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <section className='home-hero'>
        <div className='marketing-container hero-grid'>
          <div className='hero-copy'>
            <p className='marketing-eyebrow'>
              <span className='eyebrow-line' /> AI admissions chatbot for
              academic institutes
            </p>
            <h1>
              Every student question.
              <br />
              <span>A better next step.</span>
            </h1>
            <p className='hero-description'>
              Turn your institute’s knowledge into helpful admissions
              conversations. Answer student enquiries, capture leads, and bring
              in a counsellor when it matters.
            </p>
            <div className='marketing-actions'>
              <Link href='/auth/signup' className='marketing-button primary'>
                Start your free trial{' '}
                <ArrowUpRight size={18} aria-hidden='true' />
              </Link>
              <Link href='#product-demo' className='marketing-button secondary'>
                Explore the experience{' '}
                <ArrowDown size={16} aria-hidden='true' />
              </Link>
            </div>
            <p className='hero-trial-note'>
              <Check size={14} aria-hidden='true' /> 14-day trial <span>·</span>{' '}
              No credit card required <span>·</span> For eligible accounts
            </p>
            <div className='hero-audience'>
              <span>Built around your admissions day</span>
              <p>
                Colleges <i /> Training institutes <i /> Course providers
              </p>
            </div>
          </div>
          <div className='hero-product'>
            <ProductDemo />
          </div>
        </div>
      </section>

      <section className='journey-strip' aria-label='The admissions journey'>
        <div className='marketing-container journey-items'>
          {[
            {
              icon: BookOpen,
              title: 'Your knowledge',
              copy: 'Approved sources, connected',
            },
            {
              icon: MessageCircle,
              title: 'Useful answers',
              copy: 'Student questions, understood',
            },
            {
              icon: UserRoundCheck,
              title: 'Leads with context',
              copy: 'An enquiry your team can act on',
            },
            {
              icon: Users,
              title: 'Your people',
              copy: 'A counsellor when it counts',
            },
          ].map((item, index) => (
            <div className='journey-item' key={item.title}>
              <item.icon size={21} aria-hidden='true' />
              <div>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </div>
              {index < 3 ? (
                <ArrowRight
                  className='journey-arrow'
                  size={16}
                  aria-hidden='true'
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section id='features' className='marketing-section'>
        <div className='marketing-container'>
          <div className='section-heading split-heading'>
            <div>
              <p className='marketing-eyebrow'>
                Less repetition. More meaningful conversations.
              </p>
              <h2>
                Give your admissions team
                <br />a stronger starting point.
              </h2>
            </div>
            <p>
              Students need clarity before they apply. Your team needs more than
              a name and a missed chat. Bring both sides of the conversation
              together.
            </p>
          </div>
          <div className='feature-story-grid'>
            <article className='feature-story knowledge-story'>
              <div className='story-number'>
                01 <span>KNOWLEDGE → ANSWERS</span>
              </div>
              <h3>
                Your prospectus.
                <br />
                Now part of the conversation.
              </h3>
              <p>
                Help students explore programmes, fees, eligibility,
                scholarships, and application steps using information you
                approve. Supporting sources give the answer context.
              </p>
              <div
                className='knowledge-visual'
                aria-label='Illustrative knowledge sources'
              >
                <div className='knowledge-source'>
                  <span className='source-file'>
                    <FileText size={20} aria-hidden='true' />
                  </span>
                  <div>
                    <strong>Programme guide.pdf</strong>
                    <span>Courses & eligibility</span>
                  </div>
                  <CheckCircle2 size={17} aria-hidden='true' />
                </div>
                <div className='knowledge-source'>
                  <span className='source-file teal'>
                    <Globe2 size={20} aria-hidden='true' />
                  </span>
                  <div>
                    <strong>Admissions website page</strong>
                    <span>Application steps & important dates</span>
                  </div>
                  <CheckCircle2 size={17} aria-hidden='true' />
                </div>
                <div className='knowledge-answer'>
                  <span>
                    <BookOpen size={15} aria-hidden='true' /> Retrieved from
                    your trained sources
                  </span>
                  <p>Helpful answers start with the knowledge you put in.</p>
                </div>
              </div>
              <p className='source-formats'>
                PDF · DOCX · CSV · TXT · Markdown · HTML · Public web pages
              </p>
              <Link
                href='/docs/institute-knowledge'
                className='marketing-text-link'
              >
                Explore knowledge training{' '}
                <ArrowUpRight size={16} aria-hidden='true' />
              </Link>
            </article>
            <article className='feature-story lead-story'>
              <div className='story-number'>
                02 <span>ENQUIRIES → FOLLOW-UPS</span>
              </div>
              <h3>
                Start the follow-up
                <br />
                with the full picture.
              </h3>
              <p>
                Capture contact details and keep the conversation close. Review
                student interests, chat history, and summaries before deciding
                the next useful action.
              </p>
              <div
                className='lead-visual'
                aria-label='Illustrative student enquiry record'
              >
                <div className='lead-visual-header'>
                  <span className='student-avatar'>AS</span>
                  <div>
                    <strong>Alex S.</strong>
                    <span>Example student enquiry</span>
                  </div>
                  <span className='record-tag'>New lead</span>
                </div>
                <div className='lead-detail'>
                  <span>Interested in</span>
                  <strong>Data analytics programme</strong>
                </div>
                <div className='lead-detail'>
                  <span>Conversation context</span>
                  <p>Exploring entry requirements and application support.</p>
                </div>
                <div className='lead-followup'>
                  <ListChecks size={17} aria-hidden='true' />
                  <div>
                    <strong>Next step: application guidance</strong>
                    <span>Assign a counsellor · Track the outcome</span>
                  </div>
                  <ArrowUpRight size={16} aria-hidden='true' />
                </div>
              </div>
              <Link
                href='/docs/leads-and-follow-ups'
                className='marketing-text-link'
              >
                See the lead management workflow{' '}
                <ArrowUpRight size={16} aria-hidden='true' />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className='human-section'>
        <div className='marketing-container human-grid'>
          <div className='human-copy'>
            <p className='marketing-eyebrow'>03 / AI + your admissions team</p>
            <h2>
              Let AI handle the everyday.
              <br />
              <span>Keep people in the moments that matter.</span>
            </h2>
            <p>
              A student has a specific situation. An answer needs confirmation.
              Or they simply want to talk to someone. Give them a path to your
              team from the same conversation.
            </p>
            <ul className='marketing-checks'>
              {[
                'Get notified when a student requests a counsellor.',
                'Review the conversation before an available teammate joins.',
                'Keep transcripts, summaries, and lead context together.',
              ].map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} aria-hidden='true' />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href='/docs/counsellor-handoff'
              className='marketing-text-link'
            >
              Explore human handoff{' '}
              <ArrowUpRight size={16} aria-hidden='true' />
            </Link>
          </div>
          <div className='team-visual'>
            <div className='team-visual-top'>
              <span>
                <span className='team-status-dot' /> Admissions workspace
              </span>
              <span>Illustrative example</span>
            </div>
            <div className='team-inbox-row'>
              <span className='student-avatar'>AS</span>
              <div>
                <strong>Application guidance</strong>
                <p>“I’d like to speak with a counsellor.”</p>
              </div>
              <span className='handoff-tag'>Human requested</span>
            </div>
            <div className='team-context'>
              <span className='team-context-label'>CONVERSATION CONTEXT</span>
              <h3>A useful place to pick up.</h3>
              <p>
                Student interest: Data analytics
                <br />
                Question: Entry requirements
                <br />
                Next step: Application guidance
              </p>
              <div className='team-context-footer'>
                <MessageCircle size={16} aria-hidden='true' />
                <span>Same student. Same conversation.</span>
              </div>
            </div>
            <div className='team-notification'>
              <BellRing size={19} aria-hidden='true' />
              <div>
                <strong>Your team has been notified</strong>
                <span>Live handoff depends on teammate availability.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='marketing-section capabilities-section'>
        <div className='marketing-container'>
          <div className='section-heading'>
            <p className='marketing-eyebrow'>
              Thoughtful details. Everyday control.
            </p>
            <h2>
              An AI admissions chatbot.
              <br />A workspace for your team.
            </h2>
            <p>
              The tools around the conversation make it useful for your students
              and manageable for your team.
            </p>
          </div>
          <div className='capabilities-grid'>
            {capabilities.map((item) => (
              <article key={item.title}>
                <item.icon
                  className='capability-icon'
                  size={23}
                  aria-hidden='true'
                />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <Link
                  href={item.href}
                  aria-label={`Learn about ${item.title.toLowerCase()}`}
                  className='capability-link'
                >
                  Explore <ArrowUpRight size={15} aria-hidden='true' />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id='workflow' className='launch-section'>
        <div className='marketing-container'>
          <div className='section-heading split-heading'>
            <div>
              <p className='marketing-eyebrow'>
                From your content to your website
              </p>
              <h2>Start with what you already know.</h2>
            </div>
            <Link
              href='/docs/admissions-chatbot-setup'
              className='marketing-text-link'
            >
              Read the setup guide <ArrowUpRight size={16} aria-hidden='true' />
            </Link>
          </div>
          <ol className='launch-steps'>
            {[
              [
                'Bring your knowledge',
                'Add approved documents and the public website pages you want the assistant to use.',
              ],
              [
                'Make it your assistant',
                'Set the greeting, identity, contact capture, and support details. Train your sources.',
              ],
              [
                'Install. Test. Welcome students.',
                'Have your website maintainer add the widget, then test answers, leads, and handoff.',
              ],
            ].map(([title, copy], index) => (
              <li key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <div className='launch-note'>
            <ShieldCheck size={18} aria-hidden='true' />
            <p>
              <strong>Your content stays the foundation.</strong> Replace
              outdated sources and retrain when fees, dates, or admission
              policies change.
            </p>
          </div>
        </div>
      </section>

      <section id='faq' className='marketing-section faq-section'>
        <div className='marketing-container faq-grid'>
          <div className='faq-intro'>
            <p className='marketing-eyebrow'>Before you get started</p>
            <h2>
              Good questions.
              <br />
              Useful answers.
            </h2>
            <p>
              What admissions teams want to know before bringing an AI chatbot
              to their website.
            </p>
            <Link href='/contact' className='marketing-text-link'>
              Ask us something else{' '}
              <ArrowUpRight size={16} aria-hidden='true' />
            </Link>
          </div>
          <div className='faq-list'>
            {admissionsFaqs.map((item, index) => (
              <details
                key={item.question}
                className='faq-item'
                open={index === 0}
              >
                <summary>
                  {item.question}
                  <ChevronDown size={18} aria-hidden='true' />
                </summary>
                <div>
                  <p>{item.answer}</p>
                  <Link href={item.href}>
                    {item.label} <ArrowRight size={14} aria-hidden='true' />
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className='final-cta-section'>
        <div className='marketing-container'>
          <div className='final-cta'>
            <div>
              <p className='marketing-eyebrow'>
                <GraduationCap size={17} aria-hidden='true' /> Built for your
                next intake
              </p>
              <h2>
                Make the first conversation
                <br />a helpful one.
              </h2>
              <p>
                Try an AI admissions assistant with your own institute’s
                content.
              </p>
            </div>
            <div className='final-cta-actions'>
              <Link href='/auth/signup' className='marketing-button primary'>
                Start your 14-day trial{' '}
                <ArrowUpRight size={18} aria-hidden='true' />
              </Link>
              <Link href='/contact' className='marketing-text-link'>
                Talk about your institute{' '}
                <ArrowRight size={16} aria-hidden='true' />
              </Link>
              <span>No card required · Eligible accounts</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
