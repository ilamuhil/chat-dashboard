import type { Metadata } from 'next'

import {
  LegalPage,
  type LegalSection,
} from '@/components/marketing/legal-page'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How AI Chat Bot collects, uses, shares, retains, protects, and deletes account, admissions conversation, and analytics data.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    id: 'scope',
    title: 'Scope of this policy',
    paragraphs: [
      'This Privacy Policy describes how AI Chat Bot collects, uses, discloses, stores, and protects personal data when organizations and individuals use our website, dashboard, chatbot, APIs, documentation, and related services.',
      'An academic institute or other customer generally decides why and how visitor and admissions data is processed through its chatbot. In that context, the customer is the data controller or equivalent decision-maker and AI Chat Bot acts as its service provider or processor. We may separately act as controller for account, billing, security, and product analytics data.',
    ],
  },
  {
    id: 'data-collected',
    title: 'Information we collect',
    paragraphs: [
      'We collect information provided directly, generated through use of the service, received from customers, and obtained from service providers.',
    ],
    bullets: [
      'Account and profile data, such as name, email address, avatar, organization, role, and login verification information.',
      'Institute and chatbot configuration, including business descriptions, prompts, tone, greetings, lead-capture settings, API keys, and integration details.',
      'Uploaded and linked knowledge content, such as documents, extracted text, website URLs, source metadata, and training status.',
      'Conversation and admissions lead data, including messages, AI responses, contact details, handoff requests, timestamps, and conversation status.',
      'Usage and analytics data, including pages viewed, actions taken, feature usage, device and browser information, approximate location derived from IP, logs, errors, and performance events.',
      'Support communications, feedback, subscription information, and transaction references received from payment providers.',
    ],
  },
  {
    id: 'use',
    title: 'How we use information',
    paragraphs: [
      'We use information to provide and authenticate the service, process knowledge sources, generate responses, capture configured lead fields, manage conversations, notify organization members, support users, process subscriptions, and maintain account preferences.',
      'We also use information to secure and troubleshoot the service, prevent abuse, measure reliability and adoption, improve AI behaviour and product features, comply with law, enforce agreements, and protect our users and business.',
    ],
  },
  {
    id: 'monitoring',
    title: 'Conversation monitoring and analytics',
    paragraphs: [
      'By using the service, customers agree that AI Chat Bot may monitor, review, and analyze conversations, prompts, responses, feedback, usage events, errors, and related analytics for service operation, security, quality assurance, and product improvement.',
      'Customers must provide chatbot visitors with legally required notices and obtain any required consent. Customers should avoid requesting unnecessary sensitive information and should configure lead collection according to their lawful admissions process.',
    ],
  },
  {
    id: 'ai-providers',
    title: 'Third-party AI and infrastructure providers',
    paragraphs: [
      'To provide the service, we may send prompts, conversation history, retrieved institute information, uploaded or extracted content, configuration data, and relevant metadata to third-party AI model and embedding providers. Those providers process information on our behalf or under their own applicable terms.',
      'We may also disclose information to providers of hosting, databases, cloud object storage, queues, email delivery, analytics, monitoring, customer support, security, and payment processing. Providers receive information only as reasonably necessary for their function and may process it in countries other than yours.',
    ],
  },
  {
    id: 'sharing',
    title: 'Other disclosures',
    paragraphs: [
      'We may disclose information within an organization according to its membership and role settings; at a customer’s direction; during a merger, financing, acquisition, restructuring, or sale; to professional advisers; to comply with law or valid legal process; or to protect rights, safety, and service integrity.',
      'We do not sell personal data for money. We do not disclose personal data for unrelated third-party advertising.',
    ],
  },
  {
    id: 'legal-bases',
    title: 'Legal bases',
    paragraphs: [
      'Depending on location and context, we process personal data to perform a contract, pursue legitimate interests in operating and improving the service, comply with legal obligations, protect vital interests, or act on consent. Where a customer controls visitor data, the customer determines the applicable legal basis.',
    ],
  },
  {
    id: 'retention',
    title: 'Retention',
    paragraphs: [
      'We retain information for as long as reasonably needed to provide the service, maintain account and transaction records, meet legal obligations, resolve disputes, enforce agreements, preserve security logs, and maintain legitimate business records.',
      'Retention periods vary by data type, organization settings, subscription status, legal requirements, backup cycles, and technical constraints. We may de-identify or aggregate data and retain it where it can no longer reasonably identify an individual.',
    ],
  },
  {
    id: 'deletion',
    title: 'Data access and deletion requests',
    paragraphs: [
      'We will comply with valid data deletion requests, subject to identity verification, applicable law, customer instructions, security requirements, and limited records we must retain. Deletion from active systems may occur before deletion from encrypted backups, which are removed through normal backup cycles.',
      'Chatbot visitors should normally direct requests to the institute that operates the chatbot because that organization controls the admissions relationship. Account holders may contact support@aichatbot.example to request access, correction, deletion, or other applicable privacy rights.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    paragraphs: [
      'We use cookies and similar browser storage to authenticate users, remember the selected organization, maintain sessions, preserve preferences, and protect the service. We may use limited analytics technologies to understand public-site and product usage.',
      'You can control cookies through browser settings, but disabling essential storage may prevent authentication or other service features from working.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use administrative, technical, and organizational safeguards designed to protect information, including access controls, authentication, encrypted transport, scoped organization access, and monitoring. No system, transmission, or storage method is completely secure, and we cannot guarantee absolute security.',
      'Customers are responsible for account access, API key handling, role assignments, lawful content, endpoint security, and promptly reporting suspected incidents.',
    ],
  },
  {
    id: 'children',
    title: 'Children and student data',
    paragraphs: [
      'The service is sold to organizations and is not intended for children to create independent platform accounts. Academic institutes are responsible for determining whether and how their chatbot may be used by minors and for obtaining any consent required from students, parents, or guardians.',
      'Do not intentionally collect sensitive student information through the chatbot unless it is necessary, lawful, disclosed, and protected with appropriate safeguards.',
    ],
  },
  {
    id: 'international',
    title: 'International processing',
    paragraphs: [
      'AI and cloud providers may process information across borders. Where required, we use appropriate contractual or legal mechanisms for international transfers, but local protections may differ from those in your jurisdiction.',
    ],
  },
  {
    id: 'changes',
    title: 'Policy changes and contact',
    paragraphs: [
      'We may update this policy as the service, providers, and law change. The effective date above identifies the latest version. Material changes may be communicated through the service or by email.',
      'Questions or privacy requests may be sent to support@aichatbot.example. We may ask for information reasonably necessary to verify identity, authority, and the organization connected to a request.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow='Privacy'
      title='Privacy Policy'
      summary='This policy explains how account, institute knowledge, admissions conversations, leads, and product analytics are handled when you use AI Chat Bot.'
      effectiveDate='26 September 2026'
      sections={sections}
    />
  )
}
