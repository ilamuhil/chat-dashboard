export type DocStep = {
  title: string
  description: string
}

export type DocSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  steps?: DocStep[]
  note?: {
    title: string
    content: string
    tone?: 'info' | 'warning' | 'success'
  }
  code?: string
}

export type DocPage = {
  slug: string
  title: string
  navLabel: string
  description: string
  eyebrow: string
  sections: DocSection[]
}

export const docsPages: DocPage[] = [
  {
    slug: '',
    title: 'AI admissions chatbot documentation',
    navLabel: 'Documentation overview',
    eyebrow: 'Overview',
    description:
      'Learn how to configure, train, embed, and operate an AI admissions chatbot for your academic institute.',
    sections: [
      {
        id: 'what-you-can-build',
        title: 'What you can build',
        paragraphs: [
          'AI Chat Bot helps an institute turn approved admissions information into a website conversation experience. Prospective students can ask about programs, eligibility, fees, scholarships, schedules, delivery modes, locations, application steps, policies, certificates, placement assistance, and career opportunities.',
          'The assistant retrieves relevant institute content before answering. When the available content is missing or conflicting, it is designed to say that confirmation is needed and offer a human counsellor instead of inventing a fact.',
        ],
        bullets: [
          'Configure multiple bots for different institutes, campuses, programs, or audiences.',
          'Capture a student’s name, email address, and phone number at a suitable moment.',
          'Review admissions conversations and join chats that need human attention.',
          'Invite admins and editors to collaborate within an organization.',
        ],
      },
      {
        id: 'recommended-path',
        title: 'Recommended setup path',
        steps: [
          {
            title: 'Create your organization and bot',
            description:
              'Name the assistant and describe the institute it represents.',
          },
          {
            title: 'Add admissions knowledge',
            description:
              'Upload approved files and add public website URLs, then train the bot.',
          },
          {
            title: 'Configure the student experience',
            description:
              'Set tone, greeting, lead capture, and handoff expectations.',
          },
          {
            title: 'Create an API key and embed',
            description:
              'Generate a bot-specific key and add the widget to your website.',
          },
          {
            title: 'Monitor and improve',
            description:
              'Review conversations, update stale source material, and support counsellor follow-up.',
          },
        ],
      },
      {
        id: 'responsible-operation',
        title: 'Operate it responsibly',
        paragraphs: [
          'Treat the chatbot as an admissions information and workflow assistant—not as an autonomous decision-maker. Keep institute sources current and have staff review consequential information such as deadlines, fees, eligibility, scholarships, and admission outcomes.',
        ],
        note: {
          title: 'No outcome guarantees',
          content:
            'The assistant should not guarantee admission, scholarships, employment, salaries, examination results, or placements. Configure a clear path to a counsellor for uncertain questions.',
          tone: 'warning',
        },
      },
    ],
  },
  {
    slug: 'admissions-chatbot-setup',
    title: 'Set up an AI admissions chatbot',
    navLabel: 'Admissions chatbot setup',
    eyebrow: 'Getting started',
    description:
      'Create your first institute chatbot and prepare it to answer prospective student enquiries.',
    sections: [
      {
        id: 'before-you-start',
        title: 'Before you start',
        paragraphs: [
          'Gather the approved admissions material students commonly need: program summaries, eligibility rules, fee structures, scholarship policies, schedules, campus locations, application steps, contact channels, and important disclaimers.',
          'Decide which institute, campus, department, or program family the bot will represent. A focused knowledge scope usually produces clearer retrieval than combining unrelated material.',
        ],
        bullets: [
          'Use a monitored organization email address.',
          'Identify the staff who will act as admins and editors.',
          'Choose who will respond to counsellor handoff requests.',
        ],
      },
      {
        id: 'create-bot',
        title: 'Create the bot',
        steps: [
          {
            title: 'Open Bot Configuration → Interactions',
            description:
              'Choose Create Bot and provide a clear name for the assistant.',
          },
          {
            title: 'Add institute context',
            description:
              'Enter the institute name and a concise business or institute description.',
          },
          {
            title: 'Choose persona and tone',
            description:
              'Use an admissions-focused role and a tone that matches your communication style.',
          },
          {
            title: 'Write the opening message',
            description:
              'Invite a student to ask about programs, eligibility, fees, or applications.',
          },
        ],
      },
      {
        id: 'launch-checklist',
        title: 'Launch checklist',
        bullets: [
          'Train at least one current and approved knowledge source.',
          'Test ten to twenty common questions and several unsupported questions.',
          'Confirm lead capture asks only for fields your institute needs.',
          'Test a counsellor request and verify the dashboard notification.',
          'Publish visitor-facing privacy and AI notices before going live.',
        ],
        note: {
          title: 'Use real questions',
          content:
            'Ask admissions staff for the questions they repeatedly answer. These are better launch tests than generic prompts.',
          tone: 'success',
        },
      },
    ],
  },
  {
    slug: 'chatbot-customization',
    title: 'Customize the student conversation',
    navLabel: 'Chatbot customization',
    eyebrow: 'Configuration',
    description:
      'Set the admissions assistant’s identity, tone, messages, and lead-capture behaviour.',
    sections: [
      {
        id: 'identity',
        title: 'Identity and role',
        paragraphs: [
          'Give the bot a name students can understand, such as “Admissions Assistant.” The institute name and description help frame the conversation, while the bot role tells the assistant the kind of work it should perform.',
          'The organization role called admin or editor is separate from the bot persona. A bot persona controls conversational behaviour; a team role controls dashboard permissions.',
        ],
      },
      {
        id: 'tone-messages',
        title: 'Tone and key messages',
        bullets: [
          'First message: explain what the assistant can help with and invite a focused question.',
          'Confirmation message: acknowledge when requested information has been captured.',
          'Lead capture message: explain why contact details are useful and what happens next.',
          'Tone: choose a consistent style that remains concise, respectful, and appropriate for prospective students.',
        ],
        note: {
          title: 'Keep answers scannable',
          content:
            'Short paragraphs and bullets work best in a chat window. Put the direct answer first, then supporting detail.',
          tone: 'info',
        },
      },
      {
        id: 'lead-capture',
        title: 'Lead capture',
        paragraphs: [
          'Lead capture can collect name, email, phone, or any enabled combination. Ask only for information needed by the admissions team and clearly explain the next step.',
          'Choose a capture point that does not interrupt a student before receiving value. For many institutes, capturing after the first useful answer creates a more natural experience.',
        ],
      },
    ],
  },
  {
    slug: 'institute-knowledge',
    title: 'Train with institute knowledge',
    navLabel: 'Institute knowledge',
    eyebrow: 'Training data',
    description:
      'Supply approved admissions files and website pages for grounded retrieval and accurate student guidance.',
    sections: [
      {
        id: 'supported-sources',
        title: 'Supported knowledge sources',
        paragraphs: [
          'Upload PDF, TXT, Markdown, CSV, and DOC/DOCX files. For HTML content, add a public website URL so the training pipeline can extract the main page content.',
          'Keep one source focused on a coherent topic where possible. Smaller, clearly structured documents make it easier to identify and replace outdated information.',
        ],
        bullets: [
          'PDF: prospectuses, brochures, policies, and fee schedules.',
          'DOC/DOCX: maintained program and admissions documents.',
          'Markdown or TXT: structured FAQs and concise reference material.',
          'CSV: tabular program, fee, campus, or intake information.',
          'Website URL: public HTML pages with meaningful admissions content.',
        ],
      },
      {
        id: 'training-flow',
        title: 'Add and train sources',
        steps: [
          {
            title: 'Select a bot',
            description:
              'Training sources belong to a specific bot and organization.',
          },
          {
            title: 'Upload files or add URLs',
            description:
              'Wait for each source to be stored and listed in the training workspace.',
          },
          {
            title: 'Start training',
            description:
              'Sources are queued for background extraction, chunking, and embedding.',
          },
          {
            title: 'Review status',
            description:
              'Confirm sources are trained; investigate and retry failed sources.',
          },
        ],
      },
      {
        id: 'content-quality',
        title: 'Improve retrieval quality',
        bullets: [
          'Remove duplicated or contradictory versions of the same policy.',
          'Include explicit headings and context, such as program name and academic year.',
          'State currency, fee period, intake, campus, and effective dates.',
          'Replace a source when policy changes instead of relying on old content.',
          'Test questions that distinguish similar programs and eligibility rules.',
        ],
        note: {
          title: 'Public URLs only',
          content:
            'URL ingestion must be able to retrieve the page. Login-protected, blocked, or script-only pages may not yield usable content.',
          tone: 'warning',
        },
      },
    ],
  },
  {
    slug: 'website-embedding',
    title: 'Embed the admissions chatbot',
    navLabel: 'Website embedding',
    eyebrow: 'API & integration',
    description:
      'Create bot-specific credentials and add the admissions chat experience to your institute website.',
    sections: [
      {
        id: 'api-key',
        title: 'Create an API key',
        paragraphs: [
          'Open Bot Configuration → API Setup, choose the relevant bot, and create a clearly labelled API key. The secret is shown once and stored as a secure hash, so copy it to an approved secret manager.',
          'A key identifies the bot and authorizes visitor-session creation. Revoke a key immediately if it is exposed or no longer needed.',
        ],
      },
      {
        id: 'embed',
        title: 'Add the widget script',
        paragraphs: [
          'Copy the embed snippet shown in API Setup and add it to your website according to the integration package you deploy. Place it in the shared site template when the chatbot should appear across admissions pages.',
        ],
        code: '<script src="https://api.your-domain.com/embed.js"></script>',
        note: {
          title: 'Use the generated snippet',
          content:
            'The domain above is illustrative. Use the current snippet and bot credentials shown in your own API Setup page.',
          tone: 'info',
        },
      },
      {
        id: 'prelaunch',
        title: 'Before publishing',
        bullets: [
          'Test desktop and mobile placement on important admissions pages.',
          'Verify the opening message and lead-capture timing.',
          'Confirm privacy and AI notices are visible to visitors.',
          'Test session creation, reconnect behaviour, and counsellor handoff.',
          'Revoke unused keys and restrict access to production credentials.',
        ],
      },
    ],
  },
  {
    slug: 'conversations-and-leads',
    title: 'Manage admissions conversations and leads',
    navLabel: 'Conversations & leads',
    eyebrow: 'Admissions workflow',
    description:
      'Review student enquiries, understand conversation context, and prepare counsellor follow-up.',
    sections: [
      {
        id: 'conversation-list',
        title: 'Conversation workspace',
        paragraphs: [
          'The conversations area lists recent chatbot sessions with the available lead name, email, phone number, latest message, status, and handoff state. Open a conversation to review the full exchange.',
          'Use conversation context to understand the student’s interests before responding. If a conversation is closed, treat it as historical context rather than an active live session.',
        ],
      },
      {
        id: 'joining',
        title: 'Join a conversation',
        steps: [
          {
            title: 'Open the student thread',
            description:
              'Review what the student asked and how the assistant responded.',
          },
          {
            title: 'Join when human help is appropriate',
            description:
              'Accept the handoff or enter the conversation with clear context.',
          },
          {
            title: 'Respond as a counsellor',
            description:
              'Be explicit when confirming details that the AI could not verify.',
          },
          {
            title: 'Close when complete',
            description:
              'End the chat when the live exchange is finished and continue follow-up through your admissions process.',
          },
        ],
      },
      {
        id: 'lead-list',
        title: 'Lead list',
        paragraphs: [
          'Captured leads are associated with their organization, bot, and conversation context. Use the lead list to review contact details and when the enquiry was captured.',
          'Lead capture supports—not replaces—your institute’s admissions CRM process. Apply your own qualification, consent, assignment, and follow-up rules after collection.',
        ],
      },
    ],
  },
  {
    slug: 'counsellor-handoff',
    title: 'Configure counsellor handoff',
    navLabel: 'Counsellor handoff',
    eyebrow: 'Human support',
    description:
      'Give prospective students a reliable route from AI guidance to an admissions counsellor.',
    sections: [
      {
        id: 'when',
        title: 'When the assistant offers a counsellor',
        paragraphs: [
          'The assistant is instructed to offer human help when a student requests a counsellor or when approved content cannot support a confident admissions answer. This is especially important for exceptions, conflicting policies, case-specific eligibility, and consequential decisions.',
        ],
      },
      {
        id: 'flow',
        title: 'Handoff flow',
        steps: [
          {
            title: 'Student requests a person',
            description:
              'The assistant creates a handoff request for the active conversation.',
          },
          {
            title: 'Organization members are notified',
            description:
              'Persistent dashboard notifications are created and live delivery is attempted.',
          },
          {
            title: 'A counsellor accepts',
            description:
              'The conversation switches to human mode and the counsellor can respond.',
          },
          {
            title: 'Timeout is handled',
            description:
              'If nobody accepts within the configured window, the visitor receives a clear timeout state.',
          },
        ],
      },
      {
        id: 'operations',
        title: 'Operational guidance',
        bullets: [
          'Define staffed handoff hours and set realistic visitor expectations.',
          'Keep dashboard notifications enabled during coverage periods.',
          'Review unanswered handoffs and establish an offline follow-up process.',
          'Do not promise immediate human availability unless your team can meet it.',
        ],
      },
    ],
  },
  {
    slug: 'team-roles',
    title: 'Manage admins and editors',
    navLabel: 'Team roles',
    eyebrow: 'Organization access',
    description:
      'Invite admissions teammates, assign permissions, and keep organization access accountable.',
    sections: [
      {
        id: 'roles',
        title: 'Role overview',
        bullets: [
          'Admin: can view the organization and manage members, invitations, and admin/editor assignments.',
          'Editor: can view organization members but cannot invite, remove, or change member roles.',
          'The last admin cannot be removed or demoted, and administrators cannot remove themselves from the organization members page.',
        ],
      },
      {
        id: 'invite',
        title: 'Invite a member',
        steps: [
          {
            title: 'Open Users → Organization members',
            description:
              'Only an admin can start an invitation.',
          },
          {
            title: 'Enter name, email, and role',
            description:
              'Use the person’s correct identity and choose the minimum necessary role.',
          },
          {
            title: 'Send the invitation',
            description:
              'The user receives a secure magic link for direct sign-in.',
          },
          {
            title: 'Review access regularly',
            description:
              'Remove people who no longer require access and keep at least one active admin.',
          },
        ],
      },
      {
        id: 'multi-org',
        title: 'Multiple organizations',
        paragraphs: [
          'A user may belong to more than one organization. After login, users with multiple memberships can select which organization to open. Removing one membership does not delete the user account; another available organization remains accessible.',
        ],
        note: {
          title: 'Least privilege',
          content:
            'Use editor for users who do not need to manage organization membership. Review admin access when responsibilities change.',
          tone: 'success',
        },
      },
    ],
  },
  {
    slug: 'markdown-responses',
    title: 'Format chatbot responses with Markdown',
    navLabel: 'Markdown responses',
    eyebrow: 'Response formatting',
    description:
      'Understand how structured Markdown makes admissions answers easier for prospective students to scan.',
    sections: [
      {
        id: 'supported',
        title: 'Supported response formatting',
        paragraphs: [
          'The dashboard conversation view safely renders common Markdown structures from chatbot and agent responses. Use formatting to improve comprehension, not to decorate every answer.',
        ],
        bullets: [
          'Headings for longer structured guidance.',
          'Bulleted and numbered lists for requirements and steps.',
          'Bold and emphasis for short, meaningful highlights.',
          'Links for official institute pages.',
          'Code blocks and inline code where technically relevant.',
          'Tables for compact comparisons and horizontal rules for separation.',
        ],
      },
      {
        id: 'example',
        title: 'Admissions answer example',
        code:
          '### Application checklist\n\n1. Review the program eligibility.\n2. Prepare the required documents.\n3. Submit the online application.\n\n**Important:** Confirm the current deadline on the official admissions page.',
      },
      {
        id: 'guidance',
        title: 'Writing guidance',
        bullets: [
          'Lead with the direct answer before supporting detail.',
          'Use one short list rather than several nested lists.',
          'Avoid large tables on mobile unless comparison is essential.',
          'Link to official sources for details that may change.',
          'Keep answers concise unless the student asks for depth.',
        ],
      },
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting and support',
    navLabel: 'Troubleshooting',
    eyebrow: 'Help',
    description:
      'Resolve common training, embedding, email, and conversation issues in the admissions chatbot dashboard.',
    sections: [
      {
        id: 'training',
        title: 'A knowledge source failed',
        bullets: [
          'Confirm the file is a supported format and within the current upload limit.',
          'For URLs, confirm the page is public, returns HTML, and contains meaningful text.',
          'Remove duplicate or corrupted sources and upload a clean copy.',
          'Retry after a temporary storage, network, or processing interruption.',
        ],
      },
      {
        id: 'answers',
        title: 'An answer is missing or inaccurate',
        bullets: [
          'Verify the relevant source shows a trained status.',
          'Search the source for the exact fact and remove conflicting versions.',
          'Rewrite vague tables or scanned content into clearer structured text.',
          'Add the academic year, program, campus, intake, and currency where applicable.',
          'Retrain and test with a direct student-style question.',
        ],
      },
      {
        id: 'connection',
        title: 'The widget or live conversation cannot connect',
        bullets: [
          'Verify the bot-specific API key is active and the embed configuration is current.',
          'Check browser console and network errors for blocked requests.',
          'Confirm WebSocket and API endpoints are reachable from the website.',
          'Retry after a short delay if the service reports a temporary connection issue.',
        ],
      },
      {
        id: 'support',
        title: 'Contact support',
        paragraphs: [
          'If the issue persists, email support@aichatbot.example with the organization, bot name, affected page, approximate time, and a concise description. Do not send API secrets, login codes, or unnecessary student personal data.',
        ],
      },
    ],
  },
]

export const docsNav = docsPages.map(page => ({
  href: page.slug ? `/docs/${page.slug}` : '/docs',
  label: page.navLabel,
  description: page.description,
}))

export function getDocPage(slug: string) {
  return docsPages.find(page => page.slug === slug)
}
