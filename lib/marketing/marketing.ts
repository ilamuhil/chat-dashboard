// Shared inbox for contact enquiries and dashboard feedback.
// Change this address here, or override CONTACT_EMAIL in your deployment.
export const DEFAULT_CONTACT_EMAIL = 'ilamuhil@gmail.com'

export function contactEmail() {
  return process.env.CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL
}

export function siteUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:4000'
  ).replace(/\/$/, '')
}

export const admissionsFaqs = [
  {
    question:
      'Can it answer questions about our courses, fees, and eligibility?',
    answer:
      'Yes. Train each admissions chatbot on your approved course guides, prospectuses, fee information, and public website pages. It retrieves relevant information before answering and cites supporting sources. If a detail is missing or conflicting, it is instructed to ask for clarification or offer a counsellor rather than invent an answer. Test your important admissions questions before launch.',
    href: '/docs/institute-knowledge',
    label: 'See supported knowledge sources',
  },
  {
    question: 'How does an enquiry become a lead our team can work with?',
    answer:
      'Choose whether to capture contact details before the conversation or after the first message, and enable the name, email, and phone fields your team needs. The dashboard brings captured details, contact consent, enquiry context, and conversation history together. Counsellors can review the record, assign follow-ups, and record outcomes. A follow-up task tracks work; your team still makes the call or sends the email.',
    href: '/docs/leads-and-follow-ups',
    label: 'Explore leads and follow-ups',
  },
  {
    question: 'What happens when a student wants a real person?',
    answer:
      'A human-help request notifies your organization. An available teammate can open the thread, review its history, and join the same conversation. Human support depends on your staff being available: if nobody accepts before the handoff times out, the widget shows an unavailable or busy outcome. Configure your support email, hours, and reply estimate so students know how to reach your team.',
    href: '/docs/counsellor-handoff',
    label: 'Understand the handoff workflow',
  },
  {
    question:
      'Do we need to rebuild our website or write code to train the bot?',
    answer:
      'Bot configuration and knowledge training happen in the dashboard. Your website maintainer installs the embeddable chat widget using the published widget script, bot ID, and bot-specific key. You keep your existing website. Before going live, check the widget on desktop and mobile and test answers, contact capture, and counsellor handoff.',
    href: '/docs/website-embedding',
    label: 'Read the website installation guide',
  },
  {
    question: 'How do we update information for a new intake?',
    answer:
      'Maintain the sources for each bot in Training Data. Replace outdated documents or pages, train the updated sources, and check that they reach Trained status. Then test the fees, dates, eligibility rules, and application steps that changed. Adding a website URL includes that page; it does not automatically crawl or continuously sync your whole website.',
    href: '/docs/training-best-practices',
    label: 'Prepare reliable training material',
  },
  {
    question: 'Can different teams or programmes have their own assistant?',
    answer:
      'You can configure separate bots for different audiences within your plan’s bot allowance. Each bot has its own identity, sources, and website key. Invite colleagues with Owner, Admin, Counsellor or Viewer access to collaborate in your organization. Bot, reply, storage, and member allowances are shared at organization level, so choose a plan that matches the whole team.',
    href: '/docs/organizations',
    label: 'Learn about organizations and access',
  },
  {
    question: 'What can we test before choosing a paid plan?',
    answer:
      'Eligible accounts can start a 14-day trial without a credit card. The trial includes one bot, one member, five knowledge sources, and 100 AI replies. Use it to test your own admissions content and the student journey on your website. Paid plans offer more capacity, and reply add-ons are available. Review current pricing and limits before choosing a plan.',
    href: '/pricing',
    label: 'Compare plans and allowances',
  },
]
