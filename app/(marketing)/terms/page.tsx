import type { Metadata } from 'next'

import {
  LegalPage,
  type LegalSection,
} from '@/components/marketing/legal-page'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'Terms governing use of AI Chat Bot, including AI limitations, subscriptions, acceptable use, and user responsibilities.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of these terms',
    paragraphs: [
      'These Terms & Conditions govern your access to and use of AI Chat Bot, including its dashboard, chatbot, APIs, integrations, documentation, and related services. By creating an account, starting a subscription, or using the service, you agree to these terms.',
      'If you use the service for an organization, you represent that you have authority to accept these terms for that organization. If you do not agree, do not use the service.',
    ],
  },
  {
    id: 'service',
    title: 'The service',
    paragraphs: [
      'AI Chat Bot provides tools for configuring an AI admissions assistant, supplying institute content, embedding a chat experience, collecting enquiry details, reviewing conversations, and enabling human follow-up. We may improve, replace, limit, or discontinue features at any time.',
      'Availability may be interrupted for maintenance, security, third-party outages, updates, or circumstances outside our reasonable control. We do not promise uninterrupted or error-free operation.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts and organization access',
    paragraphs: [
      'You must provide accurate account information, keep access links and credentials secure, and promptly notify us of suspected unauthorized use. You are responsible for activity carried out through your account and organization.',
      'Administrators control organization membership and roles. You are responsible for ensuring that only authorized personnel can view student enquiries, uploaded content, and organization data.',
    ],
  },
  {
    id: 'ai-limitations',
    title: 'AI output and admissions decisions',
    paragraphs: [
      'AI-generated responses may be incomplete, outdated, inaccurate, or inappropriate for a particular student. The service is an information and workflow aid and is not a substitute for review by qualified admissions, legal, financial, or other professionals.',
      'You must review your source material, bot configuration, and important outputs. You must not rely on AI output as the sole basis for admission, eligibility, scholarship, fee, financial, compliance, or other consequential decisions.',
      'To the maximum extent permitted by law, AI Chat Bot is not liable for financial loss, lost revenue, lost enrolments, reputational harm, or other loss arising from incorrect, incomplete, delayed, or misunderstood AI-generated information.',
    ],
  },
  {
    id: 'content-providers',
    title: 'Your content and third-party AI providers',
    paragraphs: [
      'You retain ownership of content you upload or submit. You grant us a limited worldwide license to host, process, reproduce, transform, and transmit that content as needed to provide, secure, maintain, and improve the service.',
      'You instruct and authorize us to send prompts, conversation context, uploaded information, extracted text, and related data to third-party AI, hosting, storage, email, monitoring, and infrastructure providers. Their processing may occur in other jurisdictions and is also governed by their applicable terms.',
      'You must have all rights, notices, permissions, and lawful bases required to submit content and personal data to the service and these providers.',
    ],
  },
  {
    id: 'monitoring',
    title: 'Monitoring and product improvement',
    paragraphs: [
      'You agree that we may monitor and analyze conversations, prompts, responses, usage events, performance data, errors, and other analytics to operate the service, investigate misuse, improve safety and reliability, and develop product features.',
      'You are responsible for providing appropriate notices to chatbot visitors and for configuring your use of the service in accordance with applicable privacy, education, marketing, and communications laws.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    paragraphs: [
      'You may not use the service to violate law, infringe rights, deceive people, distribute malware, gain unauthorized access, reverse engineer protected portions of the service, interfere with operations, or process content you are not entitled to use.',
    ],
    bullets: [
      'Do not use the service for unlawful discrimination or solely automated high-impact decisions.',
      'Do not upload secrets, highly sensitive personal data, or regulated records unless you have confirmed the service is appropriate and have the required safeguards.',
      'Do not misrepresent AI output as verified institute policy when it has not been reviewed.',
      'Do not attempt to bypass usage limits, security controls, or access restrictions.',
    ],
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions, billing, and refunds',
    paragraphs: [
      'Paid subscriptions renew automatically at the end of each billing period unless cancelled before renewal. We intend to send a reminder email approximately two days before a renewal, but failure or delay in delivering a reminder does not prevent renewal or remove your responsibility to manage the subscription.',
      'Except where applicable law requires otherwise, all charges are final and non-refundable. We do not provide full or partial refunds, credits, or prorated amounts for unused time, reduced usage, downgrades, cancellation, account suspension, or termination.',
      'Taxes, payment processing charges, and similar amounts may be added where applicable. You authorize us and our payment providers to charge the payment method associated with your account.',
    ],
  },
  {
    id: 'prices',
    title: 'Price and plan changes',
    paragraphs: [
      'We reserve the right to change subscription prices, plan structures, included features, limits, and billing periods at our discretion. Changes may apply at the next renewal or at another time stated in the notice, subject to any notice required by applicable law.',
      'Your continued use after a change takes effect constitutes acceptance. If you do not accept a change, your remedy is to cancel before the change applies.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual property',
    paragraphs: [
      'The service, software, design, documentation, branding, and all related intellectual property—excluding your content—belong to AI Chat Bot or its licensors. These terms grant only a limited, non-exclusive, non-transferable, revocable right to use the service during your authorized subscription.',
      'Feedback may be used without restriction or compensation, provided we do not publicly identify you as its source without permission.',
    ],
  },
  {
    id: 'suspension',
    title: 'Suspension and termination',
    paragraphs: [
      'We may suspend or terminate access immediately if we reasonably believe there is a security risk, unlawful activity, non-payment, material breach, abuse, or risk to the service or others. You may stop using the service and cancel a subscription through available account controls.',
      'On termination, your right to use the service ends. Provisions that by their nature should survive—including payment obligations, intellectual property, disclaimers, liability limits, and dispute provisions—will survive.',
    ],
  },
  {
    id: 'warranties-liability',
    title: 'Disclaimers and limitation of liability',
    paragraphs: [
      'To the maximum extent permitted by law, the service is provided “as is” and “as available,” without warranties of accuracy, fitness for a particular purpose, non-infringement, availability, or results.',
      'To the maximum extent permitted by law, AI Chat Bot and its suppliers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages; loss of profits, revenue, data, enrolments, goodwill, or opportunities; or decisions made using the service.',
      'Where liability cannot be excluded, our aggregate liability arising from the service will not exceed the amount you paid to us for the service during the three months immediately before the event giving rise to the claim, or the minimum amount required by law, whichever is greater.',
    ],
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    paragraphs: [
      'To the extent permitted by law, you will defend and indemnify AI Chat Bot and its personnel against third-party claims, damages, liabilities, and reasonable costs arising from your content, unlawful use, violation of these terms, or infringement of another person’s rights.',
    ],
  },
  {
    id: 'changes-contact',
    title: 'Changes, notices, and contact',
    paragraphs: [
      'We may update these terms from time to time. Updated terms take effect when posted or on a later stated date. Material changes may be communicated through the service or by email. Continued use after the effective date means you accept the updated terms.',
      'These terms are governed by applicable law and mandatory consumer protections that cannot be excluded. Disputes should first be raised with us in good faith so the parties can attempt an informal resolution.',
      'Questions about these terms may be sent to support@aichatbot.example.',
    ],
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow='Legal'
      title='Terms & Conditions'
      summary='These terms explain the rules for using AI Chat Bot, your responsibilities when deploying an admissions assistant, and the limits that apply to AI-generated information.'
      effectiveDate='26 September 2026'
      sections={sections}
    />
  )
}
