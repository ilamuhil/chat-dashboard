import { buildWidgetEmbed } from '@/lib/widget/widget-embed'
import screenshotSizes from '@/public/images/docs/manifest.json'
import { CREDIT_PACK, PLANS, money, type Limits } from '@/lib/billing/catalog'

export type DocStep = { title: string; description: string }
export type DocImage = {
  src: string
  alt: string
  caption: string
  width: number
  height: number
  displayWidth: number
  srcSet: string
  callouts: string[]
}
export type DocLink = { label: string; href: string }
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
  table?: { columns: string[]; rows: string[][] }
  image?: DocImage
  links?: DocLink[]
}
export type DocPage = {
  slug: string
  title: string
  navLabel: string
  description: string
  eyebrow: string
  category: 'Start here' | 'Configure' | 'Operate' | 'Account & limits'
  menu?: string
  access?: string
  sections: DocSection[]
}
const section = (
  id: string,
  title: string,
  content: Omit<DocSection, 'id' | 'title'>,
): DocSection => ({ id, title, ...content })
const step = (title: string, description: string): DocStep => ({
  title,
  description,
})
const link = (label: string, href: string): DocLink => ({ label, href })
const image = (name: string, alt: string, caption: string): DocImage => ({
  src: '/images/docs/' + name + '.jpg',
  alt,
  caption,
  ...((
    screenshotSizes as Record<
      string,
      {
        width: number
        height: number
        displayWidth: number
        srcSet: string
        callouts: string[]
      }
    >
  )[name] || {
    width: 1280,
    height: 720,
    displayWidth: 640,
    srcSet: '',
    callouts: [],
  }),
})
function planTable(
  keys: { label: string; key: keyof Limits; bytes?: boolean; days?: boolean }[],
) {
  return {
    columns: ['Allowance', 'Trial', 'Starter', 'Growth'],
    rows: keys.map(({ label, key, bytes, days }) => [
      label,
      ...Object.values(PLANS).map((plan) =>
        bytes
          ? (plan.limits[key] / 1_000_000).toLocaleString('en-IN') + ' MB'
          : plan.limits[key].toLocaleString('en-IN') + (days ? ' days' : ''),
      ),
    ]),
  }
}

export const docsPages: DocPage[] = [
  {
    slug: '',
    title: 'Your guide to running the chatbot',
    navLabel: 'Start here',
    eyebrow: 'Product handbook',
    category: 'Start here',
    description:
      'Find the exact menu, understand the limits, and take your bot from first setup to daily admissions support.',
    sections: [
      section('choose-your-task', 'What do you need to do?', {
        paragraphs: [
          'Start with the task you want to finish. Each guide explains where to click, what settings mean, what success looks like, and how to recover when something goes wrong.',
        ],
        links: [
          link('Set up your first bot', '/docs/admissions-chatbot-setup'),
          link('Understand organizations and access', '/docs/organizations'),
          link(
            'Prepare better training material',
            '/docs/training-best-practices',
          ),
          link('Understand storage and limits', '/docs/storage-and-limits'),
          link(
            'Review a subscription or payment',
            '/docs/billing-and-subscriptions',
          ),
          link('Fix a problem', '/docs/troubleshooting'),
        ],
      }),
      section('dashboard-map', 'Find your way around the dashboard', {
        paragraphs: [
          'The organization selector is at the top of the left sidebar. Check it before creating bots, inviting teammates, or reviewing usage. The word beneath the organization name is your membership role, not your subscription plan.',
        ],
        image: image(
          'overview',
          'Dashboard overview with arrows identifying the organization selector, configuration menus, Users, Subscription, and notifications.',
          'Use the sidebar for setup and daily work. The bell at the top-right opens notifications.',
        ),
        bullets: [
          'Overview summarizes configured bots, conversation activity, leads, and trained sources. These activity counts are different from remaining subscription capacity.',
          'Bot Configuration → Interactions edits identity, support details, and lead capture. Training Data manages knowledge. API Setup manages website keys.',
          'Users → Conversations is the support workspace. Leads holds enquiry profiles and follow-ups. Organization members controls team access.',
          'Subscription shows the plan and usage. Manage billing & invoices opens billing details and payment records.',
        ],
      }),
      section('setup-order', 'Follow the setup sequence', {
        steps: [
          step(
            'Choose your organization',
            'Use an existing invitation or create the workspace that will own the bot and subscription.',
          ),
          step(
            'Configure the bot',
            'Set identity, greeting, institute description, support details, and contact capture.',
          ),
          step(
            'Add and train approved sources',
            'An upload alone does not make information available. Wait for Trained status and test answers.',
          ),
          step(
            'Install and verify the widget',
            'Create a bot-specific key, use your deployed widget bundle, and test it on the real website.',
          ),
          step(
            'Operate it with your team',
            'Watch for handoffs, review leads, monitor capacity, and replace outdated material.',
          ),
        ],
      }),
      section('use-the-guides', 'Use the screenshots and checks', {
        paragraphs: [
          'Follow the numbered arrows to find each control. Select an image to enlarge it. Names, counts, dates, and plan selections are examples; use the values in your own organization.',
        ],
        links: [
          link('Launch and maintenance checklist', '/docs/launch-checklist'),
          link('Notifications and live updates', '/docs/notifications'),
        ],
      }),
    ],
  },
  {
    slug: 'organizations',
    title: 'Organizations, accounts, and workspace boundaries',
    navLabel: 'Organizations & access',
    eyebrow: 'Account foundations',
    category: 'Start here',
    description:
      'Understand what belongs to an organization, how to switch workspaces, and why another organization does not reset your trial.',
    menu: 'Organization selector → Organizations',
    access: 'Signed-in organization members',
    sections: [
      section('organization-ownership', 'What an organization owns', {
        paragraphs: [
          'An organization is the workspace for your institute or team. Bots, training sources, files, conversations, leads, membership, and the subscription are scoped to that workspace.',
          'Your login identifies you across the product. Your Owner, Admin, Counsellor or Viewer membership applies within each organization, so the same person can have different roles in different workspaces. A bot’s conversational role is a separate setting.',
        ],
        bullets: [
          'Plan capacity is shared by the organization. It is not a separate allowance for every bot, teammate, or website.',
          'Additional bots use the same organization’s bot allowance. Choose bot boundaries around a clear campus, programme family, or audience.',
          'Website visitors are not dashboard team members. A visitor conversation does not consume a team seat.',
        ],
      }),
      section('switch-organization', 'Select the correct organization', {
        steps: [
          step(
            'Open the selector',
            'Select the organization name at the top-left of the dashboard.',
          ),
          step(
            'Choose your workspace',
            'Select a listed organization and confirm the displayed name and role.',
          ),
          step(
            'Check before editing',
            'If an old page still shows the previous workspace, reload it or navigate to the destination again. Confirm that the intended bot appears before changing anything.',
          ),
        ],
        image: image(
          'organization-menu',
          'Organization menu with an arrow pointing to the current workspace selection.',
          'Open the organization name to see your workspaces. Admin is the membership role.',
        ),
      }),
      section('create-or-join', 'Create a workspace or join a team', {
        paragraphs: [
          'During initial onboarding, enter the organization’s name and contact details; its creator becomes an admin. If your institute already has a workspace, ask its administrator for an invitation instead of creating a duplicate. To create another workspace, open the organization selector, choose Add organization, and complete its name and contact details. Check the organization allowance on your plan first.',
          'Use the email address that was invited. The sign-in link emailed from Organization members is single-use and expires after 15 minutes. Pending onboarding invitations use a separate 14-day availability window.',
        ],
        links: [link('Invitation steps and role rules', '/docs/team-roles')],
      }),
      section('trial-eligibility', 'Trial eligibility follows the account', {
        paragraphs: [
          'An eligible administrator can claim one 14-day trial. Creating more organizations with the same administrator does not grant a fresh trial each time. A new workspace may therefore require a paid plan before bot creation or training is available.',
          'The Trial member allowance includes the creator. Upgrade before inviting teammates when the organization has no available seats.',
        ],
        note: {
          title: 'Missing bots or data?',
          content:
            'First check the selected organization and your membership. Signing in successfully does not grant access to every workspace.',
          tone: 'info',
        },
        links: [
          link('Plans and account limits', '/docs/billing-and-subscriptions'),
        ],
      }),
    ],
  },
  {
    slug: 'admissions-chatbot-setup',
    title: 'Set up your first bot',
    navLabel: 'First bot setup',
    eyebrow: 'Getting started',
    category: 'Start here',
    description:
      'A practical path from a new organization to a tested admissions assistant, with checks at every stage.',
    menu: 'Bot Configuration → Interactions',
    access:
      'Ask an organization admin to provision new bots; check plan capacity first',
    sections: [
      section('before-you-start', 'Prepare what you will need', {
        bullets: [
          'A clear scope: institute, campus, programme family, or admissions audience.',
          'Approved and current course, fee, eligibility, intake, application, scholarship, and contact information.',
          'A monitored support address and someone responsible for handoffs and follow-ups.',
          'A website maintainer who can install the widget and confirm its deployed bundle URL.',
          'An active trial or subscription with room for the bot and its training sources.',
        ],
      }),
      section('create-bot', 'Create the bot', {
        steps: [
          step(
            'Open Interactions',
            'Expand Bot Configuration in the sidebar and select Interactions.',
          ),
          step(
            'Choose Create Bot',
            'For an existing assistant, select its bot card to edit it. Confirm its name first.',
          ),
          step(
            'Complete the form',
            'Set the bot name, institute name, tone, conversational role, first message, and business description. Add support and contact-capture settings.',
          ),
          step(
            'Save Configuration',
            'Wait for success. Bot creation also provisions its model configuration. If it fails, check access, plan capacity, and service availability before retrying.',
          ),
        ],
        image: image(
          'bot-list',
          'Interactions page with arrows pointing to Create Bot and an existing bot card.',
          'Create Bot starts a new assistant; a bot card opens the existing assistant’s settings.',
        ),
        links: [
          link(
            'Every configuration field explained',
            '/docs/chatbot-customization',
          ),
        ],
      }),
      section('teach-before-launch', 'Give it knowledge before testing', {
        paragraphs: [
          'Go to Training Data, select this bot, and add a small set of high-quality files or public pages. Review the submission terms yourself, start training, and wait until every required source is Trained.',
          'The business description frames the assistant’s purpose. Detailed policies, fee tables, and programme facts belong in training sources. Choosing a name or tone does not teach the bot those facts.',
        ],
        links: [
          link('Upload and train sources', '/docs/institute-knowledge'),
          link(
            'Prepare reliable source material',
            '/docs/training-best-practices',
          ),
        ],
      }),
      section('visitor-journey', 'Test the complete visitor journey', {
        steps: [
          step(
            'Ask common questions',
            'Compare programme names, fees with currency, eligibility, dates, and application steps against approved information.',
          ),
          step(
            'Ask something unsupported',
            'Check that the assistant acknowledges missing information and avoids guaranteeing an admissions outcome.',
          ),
          step(
            'Test contact capture',
            'Confirm the chosen timing and fields, then check that the enquiry appears in Leads.',
          ),
          step(
            'Request a person',
            'Have a teammate watch notifications and Conversations. Verify the visitor’s connection state.',
          ),
          step(
            'Check your real website',
            'Test the installed widget, mobile layout, support email, help link, and attachment behavior.',
          ),
        ],
        note: {
          title: 'A greeting is only the first check',
          content:
            'A bot can display a greeting before its knowledge or live support connection is ready. Verify answers, leads, and handoff before directing visitors to it.',
          tone: 'warning',
        },
      }),
    ],
  },
  {
    slug: 'chatbot-customization',
    title: 'Bot configuration: every field explained',
    navLabel: 'Bot fields & support hours',
    eyebrow: 'Configuration',
    category: 'Configure',
    description:
      'Choose identity, support, and conversation settings, and understand which values are displayed expectations.',
    menu: 'Bot Configuration → Interactions → select a bot',
    access: 'Members working with a bot in the selected organization',
    sections: [
      section('identity', 'Identity, tone, and conversational role', {
        image: image(
          'configuration-identity',
          'Bot form with arrows pointing to identity, tone, and conversational role.',
          'These settings describe the assistant. They do not change a teammate’s permissions.',
        ),
        table: {
          columns: ['Field', 'Meaning and guidance'],
          rows: [
            [
              'Bot Name',
              'Required, 3–50 characters. The assistant’s identity, such as Admissions Assistant.',
            ],
            [
              'Institute Name',
              'The institution represented in the widget. Use the public name consistently; validation expects 3–75 characters.',
            ],
            [
              'Bot avatar image URL',
              'Optional square image over HTTPS. Use a stable direct image URL you control. If it cannot load, the widget uses its default avatar.',
            ],
            [
              'Tone',
              'Friendly, Professional, Enthusiastic, Casual, Concise, Empathetic, Humorous, Authoritative, Formal, or Neutral. Professional or Friendly is a practical admissions starting point.',
            ],
            [
              'Role of the Bot',
              'Customer Support, Sales, Marketing, Technical Support, or Other. This is a conversation persona; it grants no account privileges. For an admissions assistant, choose the persona that best matches the service you provide.',
            ],
          ],
        },
      }),
      section('support-settings', 'Widget header and support settings', {
        image: image(
          'configuration-contact',
          'Support form with arrows to the email, team name, and human reply estimate. The email value is hidden.',
          'Set support hours in the team’s actual time zone. An estimate does not indicate live availability.',
        ),
        table: {
          columns: ['Field', 'Meaning and guidance'],
          rows: [
            [
              'Support email',
              'Optional monitored address. The envelope in the widget opens the visitor’s email app with a prepared support message. It does not send email automatically.',
            ],
            [
              'Support team name',
              'Optional label, up to 60 characters, such as Admissions Team.',
            ],
            [
              'Typical human reply time',
              'Optional estimate from 1 to 10,080 whole minutes. It is displayed to visitors; it is not a live queue estimate or the handoff timeout.',
            ],
            [
              'Human support hours & time zone',
              'Choose staffed weekdays, opening/closing times, and the correct time zone. The widget displays the schedule; it does not staff the inbox or guarantee someone is online.',
            ],
            [
              'Help centre link',
              'Optional HTTPS link to a real FAQ or help page. It opens separately from the conversation. Test the destination before launch.',
            ],
          ],
        },
      }),
      section(
        'support-hours',
        'Set support hours and verify the visitor header',
        {
          paragraphs: [
            'Choose only the days your team is staffed, then confirm opening time, closing time, and time zone. Check the displayed schedule in the widget. The saved schedule describes support availability; it does not automatically reject or accept handoff requests based on the clock.',
          ],
          image: image(
            'configuration-support',
            'Support-hours fields with arrows to the reply estimate, time zone, and help link.',
            'The time zone belongs to the support schedule. The reply estimate is separate from the handoff timeout.',
          ),
        },
      ),
      section('visitor-header', 'See where the settings appear to visitors', {
        paragraphs: [
          'The email action sits beside the fullscreen and close controls. The team name, help link, reply estimate, and support schedule appear below the bot identity. The paperclip at the bottom starts an attachment upload. The captured widget uses existing example settings; verify your own support destinations before launch.',
        ],
        image: image(
          'widget-support',
          'Visitor widget with arrows identifying email, help centre, reply estimate, support hours, and the attachment area.',
          'Use the header to reach support, open the help centre, and check service hours.',
        ),
      }),
      section(
        'conversation-messages',
        'Greeting, contact request, and business context',
        {
          image: image(
            'configuration-messages',
            'Conversation-message fields with arrows to the greeting, contact request, and confirmation.',
            'Write each message for its actual purpose and save after editing.',
          ),
          table: {
            columns: ['Field', 'Purpose and example'],
            rows: [
              [
                'First Message',
                'Required, 3–500 characters. Example: “Hello! I can help with programmes, eligibility, fees, and applications. What would you like to know?”',
              ],
              [
                'Lead Capture Message',
                'Explain why contact details help. Example: “Share your email so our admissions team can follow up on this enquiry.” Match the message to the enabled fields.',
              ],
              [
                'Confirmation Message',
                'Acknowledge receipt without promising an unverified response time. Example: “Thanks—your details have been recorded for the admissions team.”',
              ],
              [
                'Business Description',
                'Required, at least 3 characters and no more than 600 words. Describe the institute, audience, scope, and handoff expectations. Use training sources for detailed or changing facts.',
              ],
            ],
          },
          note: {
            title: 'A message does not complete a follow-up',
            content:
              'A confirmation message does not schedule a callback or send a campaign. Your team must review the lead and carry out the next action.',
            tone: 'info',
          },
        },
      ),
      section('lead-capture', 'Lead capture timing and fields', {
        paragraphs: [
          'Turn Lead capture on to reveal its timing and contact-field controls. Available fields are Name, Email, and Phone Number. Enable only what your follow-up process needs.',
          'Before starting the conversation requests the configured contact form before normal messaging. After the first message lets the conversation begin before the configured capture step. Test the timing in a fresh visitor session after saving; an existing session may retain earlier settings.',
          'While the contact form is visible, the widget disables its normal message composer and attachment input. Complete the form before trying to send a normal message.',
        ],
        image: image(
          'configuration-leads',
          'Lower bot configuration form with arrows identifying contact capture timing, selected fields, and Save Configuration.',
          'Choose the timing and contact fields, then save.',
        ),
      }),
      section('save-and-check', 'Save and verify your changes', {
        steps: [
          step(
            'Save Configuration',
            'Review any field validation messages. A placeholder is not necessarily a selected value.',
          ),
          step(
            'Start a fresh visitor session',
            'Check identity, greeting, support links, hours, and the contact form in the website widget.',
          ),
          step(
            'Check the team’s actual workflow',
            'Make sure displayed support hours and reply estimates match the service the team can provide.',
          ),
        ],
        links: [
          link('Human handoff behavior', '/docs/counsellor-handoff'),
          link('Widget installation', '/docs/website-embedding'),
        ],
      }),
    ],
  },
  {
    slug: 'institute-knowledge',
    title: 'Upload, train, and maintain knowledge',
    navLabel: 'Upload & train sources',
    eyebrow: 'Training data',
    category: 'Configure',
    description:
      'Add the right file or page, follow processing status, and know when information is actually available to the bot.',
    menu: 'Bot Configuration → Training Data → select a bot',
    access: 'Organization members; active plan and available capacity required',
    sections: [
      section('supported-sources', 'Supported formats and upload limits', {
        table: {
          columns: ['Source', 'What to provide'],
          rows: [
            [
              'PDF (.pdf)',
              'Text-based PDFs with readable headings and tables. OCR is disabled in the current converter; convert image-only scans to readable text first.',
            ],
            [
              'Word (.docx)',
              'Modern Word documents. Legacy .doc is not supported; export it to .docx or a readable PDF.',
            ],
            [
              'CSV (.csv)',
              'UTF-8 CSV with a non-empty, unique header for each column and consistent rows. Export .xlsx files to CSV first.',
            ],
            [
              'Plain text (.txt)',
              'Readable UTF-8 text with headings and a clear topic for each section.',
            ],
            [
              'Markdown (.md, .markdown)',
              'UTF-8 text with useful headings, lists, and descriptive links.',
            ],
            [
              'HTML (.html, .htm)',
              'Saved HTML containing substantive content. File upload is supported separately from the Website URL control.',
            ],
            [
              'Website URL',
              'One accessible public HTML page per source. Adding a homepage does not mean the entire website is crawled. Add the required pages deliberately.',
            ],
          ],
        },
        note: {
          title: 'Current dashboard upload ceiling',
          content:
            'Select up to 10 files at a time and keep each below 10 MB for reliable dashboard uploads. Growth allows 25 MB per file at the plan level, but the current dashboard still applies its own approximately 10 MB selection cap. The server also checks exact plan limits and remaining shared storage.',
          tone: 'warning',
        },
        links: [
          link('Storage and training allowances', '/docs/storage-and-limits'),
        ],
      }),
      section('add-and-train', 'Add sources and start training', {
        steps: [
          step(
            'Select the bot',
            'Choose its card in Training Data. Sources are trained for this bot, not automatically for every bot in the organization.',
          ),
          step(
            'Add public pages',
            'Enter a complete https:// address in Website URL and use the adjacent plus button. Avoid login-only pages and PDF download links; upload documents as files.',
          ),
          step(
            'Upload files',
            'Select the upload area and choose supported files. Wait for upload verification and for the filenames to appear under Training resources.',
          ),
          step(
            'Review submission terms',
            'Read the terms and privacy policy and confirm that you have permission to use the source material. Starting training requires your agreement.',
          ),
          step(
            'Choose Train Bot',
            'Do not repeatedly start the batch. Another queued or running job can block a new training request for this bot.',
          ),
          step(
            'Check every result',
            'Wait for Trained on each required source. Even at 100% completion, inspect Failed and Success counts, then test factual questions.',
          ),
        ],
        image: image(
          'training-resources',
          'Training workspace with arrows to Website URL, upload area, source statuses, progress, and Train Bot.',
          'Upload, training, and answer readiness are separate checks. Read the status beside each source.',
        ),
      }),
      section('source-status', 'What source statuses mean', {
        image: image(
          'training-progress',
          'Training progress and submission controls with arrows to results, agreement, and Train Bot.',
          'A processed batch can include failures. Review the result counts and every source status.',
        ),
        table: {
          columns: ['Status', 'Your next action'],
          rows: [
            [
              'Pending / uploading',
              'Wait for upload verification. The source is not trained. If verification fails, upload a fresh copy.',
            ],
            [
              'Created / ready',
              'The source has been added and is eligible for training. Review the terms and choose Train Bot.',
            ],
            [
              'Queued for training',
              'The source is waiting for a worker. Avoid removing it or submitting the same batch again.',
            ],
            [
              'Training',
              'Extraction and indexing are running. Keep the source unchanged until processing finishes.',
            ],
            [
              'Trained',
              'Processing succeeded. Test representative questions to verify that the source contains the answers you need.',
            ],
            [
              'Training failed',
              'Open the error information beside the source. Read the latest message, stage, action, and resolved status. Retry that source after fixing the cause.',
            ],
          ],
        },
        paragraphs: [
          'Overall completion measures processed sources, including failures. Check Success and Failed instead of treating 100% as universal success. Error history can remain after recovery; check the current source status and resolved labels.',
        ],
      }),
      section(
        'replace-and-remove',
        'Replace stale information and remove sources',
        {
          paragraphs: [
            'Identical file contents are deduplicated for the selected bot. Renaming the same file does not create fresh knowledge. A duplicate URL is rejected; the current workflow asks you to remove and re-add a page to refresh its content.',
            'Keep approved originals outside the product. Record the source purpose, remove an obsolete version when safe, add the replacement, train it, and verify the changed facts. Avoid leaving conflicting old and new policies active.',
            'A queued or training source cannot be removed until its job finishes. The current screen also leaves removal and retry controls disabled until you have reviewed and accepted its submission terms. Removing trained knowledge affects future retrieval; it does not rewrite answers already sent in older conversations.',
          ],
          note: {
            title: 'Deletion does not refund training work',
            content:
              'Cleanup can free source count, stored bytes, and active knowledge capacity. Training tokens already used in the billing cycle remain used.',
            tone: 'info',
          },
          links: [
            link('Training best practices', '/docs/training-best-practices'),
            link(
              'Training-failure recovery',
              '/docs/troubleshooting#training-failed',
            ),
          ],
        },
      ),
    ],
  },
  {
    slug: 'training-best-practices',
    title: 'Prepare training material that produces useful answers',
    navLabel: 'Training best practices',
    eyebrow: 'Knowledge quality',
    category: 'Configure',
    description:
      'Make documents readable, CSVs reliable, policies precise, and checks repeatable after every update.',
    sections: [
      section(
        'organize-your-sources',
        'Organize around real visitor questions',
        {
          paragraphs: [
            'Prepare focused sources for courses and fees, entry requirements, application steps, intakes, scholarships, and student services. Appoint an owner and a review date for every source.',
            'Make each section self-contained: name the programme, campus, audience, intake, and effective date. A retrieved passage may be read without the rest of the document, so “the above course” or “same as last year” is weak context.',
          ],
          bullets: [
            'Use descriptive headings, such as “BSc Data Science — 2027 intake — fees”.',
            'Include currency, annual versus total cost, conditions, and the effective date for every fee.',
            'Separate policy from estimates, exceptions, and decisions requiring staff approval.',
            'Resolve contradictory versions before upload. More files do not automatically produce better answers.',
            'Exclude passwords, internal access keys, and information the assistant should never repeat to visitors.',
          ],
        },
      ),
      section('format-specific', 'Choose a clean format for the material', {
        table: {
          columns: ['Format', 'Best practice'],
          rows: [
            [
              'PDF',
              'Use selectable text. Preserve reading order and table headers. Check columns and multi-page tables after export. Convert scans before upload because OCR is off.',
            ],
            [
              'DOCX',
              'Use actual heading styles, simple tables, and plain paragraphs. Remove comments, tracked changes, and obsolete appendices from the training copy.',
            ],
            [
              'CSV',
              'Use one record per row, descriptive unique headers, UTF-8 encoding, and properly quoted commas/newlines. Export spreadsheet workbooks to CSV first.',
            ],
            [
              'Markdown / TXT',
              'Use short related paragraphs and meaningful headings. Include units and context in the section instead of relying on its position in the file.',
            ],
            [
              'HTML / public pages',
              'Choose a substantive content page. Avoid account portals, navigation-only pages, and screens whose meaningful content is unavailable without client-side interaction.',
            ],
          ],
        },
      }),
      section('csv-example', 'A CSV that explains its own values', {
        paragraphs: [
          'Keep programme, campus, intake, fee basis, and conditions in each record. Empty or duplicate headers and extra unquoted values can fail parsing. Extremely long individual fields can exceed extraction limits; split them into focused records. The following fictional values illustrate structure, not institute policy.',
        ],
        code: 'programme,campus,intake,fee_inr,fee_basis,eligibility\n"BSc Data Science","Chennai","2027",120000,"per academic year","Class 12; confirm subject requirements with admissions"',
      }),
      section('policy-example', 'A self-contained policy section', {
        code: '# Scholarship policy — 2027 intake\nApplies to: BSc Data Science, Chennai campus\nEffective date: 1 January 2027\n\nStudents may apply after submitting verified academic records.\nThe scholarship committee reviews eligibility and available funding.\nA chatbot response is not an award confirmation.\nContact admissions for an individual decision.',
        note: {
          title: 'Replace illustrative facts before training',
          content:
            'The sample programme, fee, intake, and policy are writing examples. Use your institute’s approved facts and conditions.',
          tone: 'info',
        },
      }),
      section('verify-an-update', 'Check knowledge after every update', {
        steps: [
          step(
            'Create an answer checklist',
            'For every source, list the questions it should answer and the approved facts you expect.',
          ),
          step(
            'Test conditions and exceptions',
            'Ask about another intake, an unsupported programme, missing evidence, and ambiguous eligibility.',
          ),
          step(
            'Inspect references',
            'Where an answer cites a source, confirm that the passage supports the specific claim. A citation alone does not prove correctness.',
          ),
          step(
            'Test a fresh visitor journey',
            'Review factual answers, contact capture, and a request for a counsellor against the approved originals.',
          ),
          step(
            'Record the review',
            'Keep the version, owner, review date, and open questions outside the product. Update the responsible source rather than stacking duplicates.',
          ),
        ],
        links: [
          link('Training workflow', '/docs/institute-knowledge'),
          link('Launch checklist', '/docs/launch-checklist'),
        ],
      }),
    ],
  },

  {
    slug: 'storage-and-limits',
    title: 'Storage types, quotas, and retention',
    navLabel: 'Storage & limits',
    eyebrow: 'Capacity',
    category: 'Account & limits',
    description:
      'Manage training files, visitor attachments, and bot-servable resources, and understand how they use your storage allowance.',
    menu: 'Subscription → usage meters',
    access:
      'Organization members can inspect usage; admins manage the subscription',
    sections: [
      section('three-storage-types', 'The three storage categories', {
        table: {
          columns: ['Category', 'Purpose', 'How to use it'],
          rows: [
            [
              'Training data storage',
              'Institute documents used to answer factual questions.',
              'Upload through Training Data and train the source. Original files consume uploaded-file storage; extracted knowledge also has source-count and token limits.',
            ],
            [
              'Visitor-uploaded storage',
              'Images or documents attached by visitors during a conversation.',
              'Attachments belong to the conversation and are intended for support review. They share the organization’s uploaded-file allowance with training files.',
            ],
            [
              'Bot-servable resource files',
              'Approved files the bot can deliver to visitors, such as brochures, prospectuses, and application packs.',
              'Upload a resource for the selected bot, give it a clear title and description, and test that visitors can open the correct file. Resources use organization storage; they are separate from sources used for training.',
            ],
          ],
        },
        note: {
          title: 'Choose the right storage type',
          content:
            'Use training data to teach answers, visitor attachments to collect files during a chat, and bot resources to deliver approved downloads. Upload a brochure as a resource when visitors need the file; train its content separately when the bot also needs to answer questions about it.',
          tone: 'info',
        },
      }),
      section(
        'shared-storage',
        'Uploaded files share one organization allowance',
        {
          paragraphs: [
            'The Uploaded files meter in Subscription tracks training files, visitor attachments, and bot resources across the organization’s bots. Each upload uses the same organization allowance. Pending training uploads can also reserve space before the visible meter catches up.',
            'Example: with a 100 MB allowance, 70 MB of training files, 20 MB of visitor attachments, and 5 MB of bot resources leave about 5 MB before other reservations. Adding another bot or teammate does not increase that allowance.',
            'Storage measures bytes. Active knowledge measures the extracted text in tokens. A compact file can contain lots of text, so unused file storage does not guarantee that a large training batch will fit.',
          ],
          image: image(
            'subscription-usage',
            'Subscription page with arrows pointing to uploaded-file storage, training sources, team seats, and training usage.',
            'Uploaded files is shared capacity. Sources and training tokens are separate checks.',
          ),
        },
      ),
      section('standard-storage-limits', 'Standard plan limits', {
        table: planTable([
          {
            label: 'Uploaded files — shared total',
            key: 'storageBytes',
            bytes: true,
          },
          { label: 'Plan ceiling per file', key: 'fileBytes', bytes: true },
          { label: 'Training sources — files plus URLs', key: 'sources' },
          { label: 'Active trained content — tokens', key: 'corpusTokens' },
          { label: 'Training work per cycle — tokens', key: 'trainingTokens' },
        ]),
        paragraphs: [
          'These are standard catalog allowances. Your organization’s active Subscription page is authoritative for its purchased plan and account-specific limits. Plan storage MB means 1,000,000 bytes.',
          'Upload up to 10 training files per selection and keep each file below the displayed 10 MB upload limit. The upload screen’s file-size limit and your plan’s per-file ceiling both apply; use the smaller limit.',
          'The visitor widget applies a separate 5 MiB attachment cap, displayed as 5 MB. The server additionally checks the plan’s per-file ceiling and remaining shared storage.',
        ],
      }),
      section(
        'visitor-attachments',
        'Visitor attachments: formats and expectations',
        {
          paragraphs: [
            'The paperclip accepts PDF, DOCX, TXT, JPG, JPEG, PNG, GIF, and WebP in the widget. It sends one selected file at a time. Use a conventional lowercase filename extension and keep the file below the displayed 5 MB limit.',
            'A visitor must have a valid chat session, and the normal composer is unavailable while the contact-capture form is on screen. Complete the form first. If the same filename already exists in that conversation, rename the attachment and retry.',
            'The service acknowledges an uploaded file for support review. It does not automatically train on it or promise that the AI has read and understood the attachment.',
          ],
          links: [
            link(
              'Conversation and attachment workflow',
              '/docs/conversations-and-leads',
            ),
          ],
        },
      ),
      section(
        'bot-resource-files',
        'Give visitors the right downloadable resource',
        {
          steps: [
            step(
              'Select the organization and bot',
              'Manage the resource files for the bot that should share them. Check remaining storage and the file-size limit before uploading.',
            ),
            step(
              'Prepare a visitor-ready file',
              'Use a clear filename and an approved, accessible document. Include the programme, intake, and revision date where useful. Remove internal comments, private records, and outdated fees.',
            ),
            step(
              'Upload and describe the resource',
              'Give the file a concise title and explain when it is useful, such as the prospectus for a particular programme. Keep separate resources for materially different campuses, intakes, or audiences.',
            ),
            step(
              'Test the visitor journey',
              'In a fresh chat, ask for the resource, open the offered download, and confirm the contents and version. Replace superseded files promptly and remove resources that should no longer be shared.',
            ),
          ],
          paragraphs: [
            'Resource files consume uploaded-file storage. Training-source counts and training-token allowances apply when content is added for training. Keep your approved originals outside the chatbot and retain a copy of each published version.',
          ],
        },
      ),
      section('free-capacity', 'Free the capacity that is actually full', {
        table: {
          columns: ['Limit reached', 'Useful action'],
          rows: [
            [
              'Uploaded bytes',
              'Remove obsolete training files and bot resources when safe. Conversation attachments remain until the product’s removal or retention cleanup removes them. Export records you need before retention runs.',
            ],
            [
              'Source count',
              'Remove obsolete files or URL sources. Each active URL consumes a source slot even without a large uploaded file.',
            ],
            [
              'Active trained-content tokens',
              'Remove stale knowledge or simplify repetitive material. Deleting the source can free its active corpus allocation after cleanup.',
            ],
            [
              'Training tokens this cycle',
              'Wait for the next successful billing cycle or choose a suitable plan. Deleting content does not undo training work already consumed.',
            ],
            [
              'Single-file size',
              'Export a cleaner copy, split by topic, or compress oversized images inside a document. Total free storage does not override the per-file cap.',
            ],
          ],
        },
      }),
      section('retention', 'Retention and export', {
        table: planTable([
          {
            label: 'Conversation transcripts',
            key: 'transcriptDays',
            days: true,
          },
          { label: 'Lead records', key: 'leadDays', days: true },
        ]),
        paragraphs: [
          'Retention is separate from storage capacity. Older conversations and associated attachments can be removed under the retention process; do not use the chatbot as your only archive.',
          'The scheduled cleanup records a warning at least seven days before eligible records are removed. Trial records and records after a prolonged subscription lapse have additional expiry cleanup. A 30-day post-expiry recovery window applies before broader record removal, followed by the applicable warning process.',
          'Use Subscription → Export records before expiry or retention deadlines and store the export securely. An export of organization records is not a substitute for keeping the original training files and any attachments you need.',
        ],
        links: [
          link(
            'Billing, expiry, and export',
            '/docs/billing-and-subscriptions#retention-export',
          ),
        ],
      }),
    ],
  },
  {
    slug: 'billing-and-subscriptions',
    title: 'Billing, subscriptions, and usage',
    navLabel: 'Billing & subscriptions',
    eyebrow: 'Subscription management',
    category: 'Account & limits',
    description:
      'Understand plans, reply allowances, payment states, renewal changes, invoices, and the steps to take before capacity runs out.',
    menu: 'Subscription; Manage billing & invoices',
    access:
      'Members can review usage; organization admins manage billing and export',
    sections: [
      section(
        'find-your-subscription',
        'Read your organization’s subscription',
        {
          paragraphs: [
            'Open Subscription in the left sidebar. Check the selected organization, plan name, status, access/renewal date, pending checkout, and usage meters. An active key or an old successful receipt is not proof of current subscription access.',
            'A sandbox banner means the application is using test billing. Sandbox receipts and sample invoice rows are test documents and must not be treated as evidence of a live charge.',
          ],
          image: image(
            'subscription-status',
            'Subscription workspace with arrows to status, payment refresh, billing navigation, and usage meters.',
            'Check status and remaining capacity here before repeating a checkout. Captured amounts and dates are examples.',
          ),
        },
      ),
      section('standard-plans', 'Standard plans and team limits', {
        paragraphs: [
          'An eligible account receives a 14-day Trial. The administrator’s trial eligibility is used once; another organization does not restart it.',
          'Starter is ' +
            money(PLANS.starter.pricePaise) +
            ' per month and Growth is ' +
            money(PLANS.growth.pricePaise) +
            ' per month, plus applicable tax. Checkout shows the actual subtotal, tax, and total. Do not infer tax treatment from a sample screenshot.',
        ],
        table: planTable([
          { label: 'Included AI replies per cycle', key: 'replies' },
          { label: 'Team members, including admins', key: 'members' },
          { label: 'Bots', key: 'bots' },
          {
            label: 'Shared uploaded-file storage',
            key: 'storageBytes',
            bytes: true,
          },
          { label: 'Training sources', key: 'sources' },
        ]),
        links: [
          link('All storage and training limits', '/docs/storage-and-limits'),
        ],
      }),
      section('what-counts', 'What consumes an allowance?', {
        bullets: [
          'Test chats count toward AI replies. A completed AI response uses reply allowance; human support messages are a different workflow.',
          'Included reply and training allowances belong to the billing period and renew after successful payment. They are not unlimited because a new calendar month began.',
          'Additional reply packs are consumed after included replies, using eligible packs in expiry order. A reply pack does not add team seats, bots, file storage, source slots, or training capacity.',
          'Training tokens measure processed knowledge work during the cycle. Active corpus tokens measure knowledge currently retained. They are separate limits.',
          'Active members and eligible pending onboarding invitations count toward seat enforcement. The visible member count can be lower than the seats already reserved.',
        ],
        note: {
          title: 'Reply exhaustion and subscription expiry differ',
          content:
            'When only AI replies run out, contact capture and counsellor handoff remain available in the product flow. An expired plan is a separate access restriction; buying reply packs does not renew a subscription.',
          tone: 'info',
        },
      }),
      section('start-a-subscription', 'Start a paid subscription', {
        steps: [
          step(
            'Check the organization and billing details',
            'Open Manage billing & invoices. Enter billing name, email, Indian phone number, address, and state. GSTIN is optional. Save and verify the details before payment.',
          ),
          step(
            'Choose your capacity',
            'Return to Subscription and choose the suitable paid plan. Read the confirmation, price, tax, and recurring-payment terms.',
          ),
          step(
            'Complete the provider’s checkout',
            'The account owner should review and complete the payment and authorization. Returning to the dashboard alone does not confirm payment.',
          ),
          step(
            'Wait for verified status',
            'Check the resulting plan and access date. Use Refresh payment status if checkout is pending. Avoid starting multiple payments while an existing one is unresolved.',
          ),
        ],
        image: image(
          'billing-details',
          'Billing form with arrows to required billing fields, optional GSTIN, and Save billing details. Personal values are hidden.',
          'Complete the billing form before checkout. Updating it does not rewrite earlier receipts.',
        ),
      }),
      section(
        'renewal-and-plan-changes',
        'Renewals, upgrades, and downgrades',
        {
          paragraphs: [
            'Changing an active recurring plan schedules the new plan for the next collection. The new quotas are granted only after that amount is successfully collected; selecting Growth is not an immediate capacity grant.',
            'The current service blocks renewal-plan changes in the last two days before the next collection because payment is already being prepared. Follow the displayed message and wait for renewal or contact support.',
            'Before scheduling a smaller plan, reduce bots, seats including pending invitations, stored bytes, source count, active knowledge, and oversized existing files to fit. A pending lower plan can also restrict new additions before it takes effect.',
            'Cancel renewal stops future renewal and preserves access until the paid-through date shown. It is different from cancelling an unfinished checkout. If renewal is already cancelled, follow Resume subscription or Resume renewal and complete any required provider authorization.',
          ],
          image: image(
            'subscription-plans',
            'Subscription plan area with arrows to plan choices, reply add-on controls, and record export.',
            'Choose capacity deliberately. Add replies increases reply capacity only.',
          ),
        },
      ),
      section(
        'reply-packs',
        'Buy extra replies when that is the only shortage',
        {
          paragraphs: [
            'The standard add-on rate is ' +
              money(CREDIT_PACK.pricePaise) +
              ' for ' +
              CREDIT_PACK.replies.toLocaleString('en-IN') +
              ' replies, plus applicable tax. The available quantity ranges from ' +
              CREDIT_PACK.minReplies.toLocaleString('en-IN') +
              ' to ' +
              CREDIT_PACK.maxReplies.toLocaleString('en-IN') +
              ' in steps of ' +
              CREDIT_PACK.stepReplies +
              '. Review the final quoted total.',
            'Packs expire ' +
              CREDIT_PACK.expiryDays +
              ' days after payment and do not automatically recharge. They require an eligible paid subscription and do not restore expired account access. Check every pack’s expiry on Subscription before buying more.',
          ],
        },
      ),
      section('payment-problems', 'Pending or failed payments', {
        steps: [
          step(
            'Read the payment status',
            'A pending, failed, user-dropped, or cancelled checkout is not the same as a successful payment.',
          ),
          step(
            'Refresh before retrying',
            'Use Refresh payment status after returning from the provider. Do not repeatedly pay while confirmation is pending.',
          ),
          step(
            'Resolve the provider’s reason',
            'Review the failure reason and fix the payment method or authorization. Use the retry action when the dashboard offers one.',
          ),
          step(
            'Check access dates',
            'A failed renewal can receive a three-day recovery grace period. Rely on the account’s displayed status and deadline; this is not an extension for an already cancelled renewal.',
          ),
        ],
      }),
      section('invoices', 'Receipts, PDF invoices, and historical details', {
        paragraphs: [
          'Go to Manage billing & invoices → Payments & invoices. Receipt opens the payment record. Download PDF becomes available seven days after payment; an earlier disabled download is expected.',
          'PDF invoices are generated when requested. Billing detail changes do not rewrite previous receipts. Sample invoices are previews and do not change the subscription or allowance.',
        ],
        image: image(
          'billing-invoices',
          'Payments and invoices controls with arrows to payment status, Receipt, and Download PDF. Identifying payment details are hidden.',
          'Use the status for payment confirmation. A receipt and a downloadable PDF have different availability.',
        ),
      }),
      section(
        'retention-export',
        'Before cancelling, expiry, or retention cleanup',
        {
          paragraphs: [
            'Use Subscription → Export records while you have the necessary access. Keep approved training originals and business-critical follow-up records separately.',
            'Transcript and lead retention varies by plan. Scheduled removal warns eligible organizations at least seven days before cleanup. A prolonged lapse can lead to broader record removal after the recovery window; cancellation is not an indefinite archive.',
          ],
          links: [
            link(
              'Retention periods and storage types',
              '/docs/storage-and-limits#retention',
            ),
          ],
        },
      ),
    ],
  },
  {
    slug: 'team-roles',
    title: 'Invite teammates and manage roles',
    navLabel: 'Invites & team roles',
    eyebrow: 'Team access',
    category: 'Account & limits',
    description:
      'Choose the right role, understand when a seat is consumed, and resolve sign-in or invitation problems.',
    menu: 'Users → Organization members',
    access:
      'Admins invite, change roles, and remove members; members can view the list',
    sections: [
      section('roles', 'Owner, Admin, Counsellor and Viewer roles', {
        paragraphs: [
          'Owner controls billing, subscriptions and privileged memberships, as well as every institute feature. Admin manages bots, training, the institute profile, admissions, and Counsellor or Viewer memberships.',
          'Counsellor works with leads, follow-ups and human conversations. Viewer can read operational records without changing them. Staff access is institute-wide; branch restrictions are outside this release.',
          'Only Owners can add or change Owner and Admin memberships. You cannot change your own role here, and an institute must retain an Owner. Existing Admins were migrated to Owners and Editors to Counsellors.',
          'The bot’s conversational role and token purpose are separate from a person’s organization role.',
        ],
      }),
      section('invite-a-member', 'Invite a teammate', {
        steps: [
          step(
            'Check available seats',
            'An Owner can review the subscription. Existing members and eligible pending invitations use seats.',
          ),
          step(
            'Choose Invite user',
            'Enter the person’s name and email, then choose the least access they need. Admins can invite Counsellors and Viewers; Owners can assign all four roles.',
          ),
          step(
            'Send the invitation',
            'A new membership is created and a secure sign-in link is emailed. Existing memberships must be changed using their role control; inviting again will not overwrite access.',
          ),
          step(
            'Have the recipient sign in',
            'Use the single-use emailed link within 15 minutes. Existing users can also use their normal sign-in method.',
          ),
          step(
            'Verify the workspace',
            'Check the selected institute and role before working on visitor records.',
          ),
        ],
      }),
      section('invitation-lifetimes', 'Two invitation paths, two time limits', {
        paragraphs: [
          'Organization members sends a 15-minute single-use magic sign-in link and establishes membership in that flow. A delivery failure does not necessarily mean no membership was created; check the member list before trying again.',
          'Onboarding can show pending invitations associated with the signed-in email. These invitations are available for 14 days. Unaccepted invitations in that window count toward seat enforcement.',
          'Do not promise that a pending-invite management or revoke button exists if you cannot see one. If a reserved seat cannot be resolved through the visible member controls, ask an admin or support to check it.',
        ],
      }),
      section('change-or-remove', 'Change access and remove a member', {
        bullets: [
          'An admin can select another member’s Admin or Editor role from the member list. The affected person receives an access-change email.',
          'You cannot change your own role or remove yourself through these controls.',
          'The last admin cannot be demoted or removed. Have another administrator in place before transferring responsibility.',
          'Removing someone revokes their membership in this organization. It does not delete their login or memberships in other organizations.',
          'If no organization membership remains, the removed user may be returned to onboarding.',
        ],
        note: {
          title: 'Review people and website keys separately',
          content:
            'A team member’s access and a website API key are separate records. When responsibility changes, review the active widget keys as well as the member list.',
          tone: 'info',
        },
      }),
      section(
        'invitation-troubleshooting',
        'When an invitation does not work',
        {
          table: {
            columns: ['Symptom', 'Next step'],
            rows: [
              [
                'Seat limit reached',
                'Check current members and pending onboarding invitations. Remove unneeded membership through an admin or choose sufficient plan capacity.',
              ],
              [
                'Link expired or already used',
                'Use normal sign-in with the invited email if membership already exists, or ask the admin for a fresh invitation link.',
              ],
              [
                'Wrong organization after login',
                'Check the organization selector; a shared login can belong to several workspaces.',
              ],
              [
                'No invite email',
                'Check the exact address, spam folder, and member list. Ask the administrator to verify delivery rather than creating a second account unnecessarily.',
              ],
            ],
          },
        },
      ),
    ],
  },
  {
    slug: 'notifications',
    title: 'Notifications and live updates',
    navLabel: 'Notifications & live updates',
    eyebrow: 'Daily operations',
    category: 'Operate',
    description:
      'Find alerts, understand what they mean, and keep working when instant updates are temporarily unavailable.',
    menu: 'Top-right bell → See all notifications',
    access: 'Notifications are addressed to individual organization members',
    sections: [
      section('notification-menu', 'Find and act on notifications', {
        steps: [
          step(
            'Open the bell',
            'The unread count indicates alerts for your signed-in account and selected workspace. The dropdown shows recent notifications.',
          ),
          step(
            'Read the alert',
            'Handoff and end-chat requests can open the relevant conversation. Lead alerts lead to the Leads workspace.',
          ),
          step(
            'Open the full list',
            'Choose See all notifications to review older items and manage read state.',
          ),
        ],
        image: image(
          'notification-menu',
          'Notification dropdown with arrows to the bell, its empty state, and See all notifications.',
          'Opening an alert is not the same as accepting a chat or completing a follow-up.',
        ),
      }),
      section('alert-types', 'What common alerts require', {
        table: {
          columns: ['Alert', 'Action'],
          rows: [
            [
              'Counsellor / handoff request',
              'Open the conversation and use Join conversation if you can help. Viewing the request alone does not connect a human.',
            ],
            [
              'Visitor requests to end a human conversation',
              'Review the thread, respond if needed, and use Close conversation when ready.',
            ],
            [
              'Lead captured',
              'Open Leads, review the contact and enquiry, and arrange follow-up. Do not assume an automatic outbound call or email was sent.',
            ],
            [
              'Invitation or role change',
              'Check the organization and your current role. Use the invited email for sign-in.',
            ],
            [
              'Billing, renewal, or retention',
              'Read the notice and go to Subscription or billing management directly if the alert has no destination link.',
            ],
          ],
        },
      }),
      section('read-and-clear', 'Read, unread, and clearing alerts', {
        paragraphs: [
          'Reading an alert updates its read status. Opening a related conversation also marks its associated handoff notification as read. Read status is personal; it is not a record that someone accepted responsibility.',
          'The full list offers Mark all read where unread alerts exist, individual removal, and Clear all. Clearing alerts does not resolve the underlying lead, handoff, payment, or conversation. Keep records you need before clearing.',
        ],
        image: image(
          'notifications-page',
          'Notification workspace showing the empty state. Read and clear controls appear when notifications exist.',
          'Read and clear controls appear when there are notifications to manage.',
        ),
      }),
      section('live-update-fallback', 'When live updates are unavailable', {
        paragraphs: [
          'Instant dashboard alerts use a live event connection while the dashboard is open. If it fails, the app shows “Live updates are temporarily unavailable” and falls back to refreshing stored notifications every 30 seconds.',
          'Keep the dashboard open during support hours. Reload it to re-establish the instant event connection after connectivity recovers. Stored alerts can still be recovered even when live delivery failed.',
          'These are in-app alerts, not a guarantee of operating-system push notifications or an email for every event. Team invitation and billing emails are separate workflows.',
        ],
        note: {
          title: 'Conversation connectivity is separate',
          content:
            'Notification polling does not repair a disconnected chat socket. Check the conversation’s own Connecting or connection state before promising that a visitor received your message.',
          tone: 'warning',
        },
        links: [
          link('Handoff and recovery', '/docs/counsellor-handoff'),
          link(
            'Connection troubleshooting',
            '/docs/troubleshooting#connection',
          ),
        ],
      }),
    ],
  },

  {
    slug: 'website-embedding',
    title: 'Install and check the website widget',
    navLabel: 'API keys & website install',
    eyebrow: 'Website integration',
    category: 'Configure',
    description:
      'Create a key for the right bot, understand the current embed template, and verify the visitor experience on your website.',
    menu: 'Bot Configuration → API Setup',
    access:
      'Organization members managing the selected bot’s website integration',
    sections: [
      section('create-api-key', 'Generate a bot-specific website key', {
        steps: [
          step(
            'Open API Setup',
            'Confirm the organization and make sure the intended bot exists. The page heading is API & Integrations.',
          ),
          step(
            'Choose Generate API Key',
            'Enter a recognizable label, such as Institute website — production, and choose the correct bot. A label is for your team, not the visitor’s display name.',
          ),
          step(
            'Copy the key immediately',
            'The plaintext key is displayed once after generation. Save it in the approved place for your website integration before closing the dialog.',
          ),
          step(
            'Record its purpose',
            'Keep track of which website uses which bot and key. The active-key list shows labels and bot names, not the plaintext key.',
          ),
        ],
        image: image(
          'api-key-dialog',
          'Generate API key dialog with arrows to the label, bot selector, and generate control.',
          'Choose the bot deliberately. A key belongs to one bot in one organization.',
        ),
      }),
      section(
        'current-embed-template',
        'Copy the automatic website installation',
        {
          paragraphs: [
            'In Bot Configuration → API Setup, use the Embeddable code panel. Enter the published widget script URL, select the widget theme, and paste the website key generated for your bot. Copy embed code becomes available when the required values are filled in.',
            'Paste the copied script once into your website head. It automatically initializes after the page body is ready. React, ReactDOM, styles, images, and audio are included; plain HTML and other non-React websites need no extra React scripts or stylesheet links.',
            'The script URL must point to the published chat-widget-ui.iife.js bundle. A deployment maintainer can set NEXT_PUBLIC_WIDGET_SCRIPT_URL on the dashboard to prefill this field. The widget build must use the deployed dashboard and chat-server URLs; a public website must not use a bundle built against localhost.',
            'The selected theme is written to data-theme. It accepts light or dark and defaults to light when omitted; it is independent of the dashboard theme. Only data-api-key is required. The dashboard resolves the bot from the active API key in the existing configuration request; no additional lookup request or stored bot ID is needed. The widget does not contain a default key.',
          ],
          code: buildWidgetEmbed({
            url: 'YOUR_PUBLISHED_WIDGET_SCRIPT_URL',
            apiKey: 'YOUR_BOT_WIDGET_KEY',
            theme: 'light',
          }),
          note: {
            title: 'Install once',
            content:
              'Use either this automatic script or the manual alternative below. Replace the example values with your published script URL and the website key.',
            tone: 'info',
          },
        },
      ),
      section(
        'manual-widget-initialization',
        'Initialize from JavaScript instead',
        {
          paragraphs: [
            'For manual installation, load the same published bundle without data-api-key, then call window.injectChat({ api_key, theme }) after the script loads. The onload example below preserves that loading order, including when installed in the head.',
            'window.chatInject remains an alias for existing installations. Only api_key is required; theme accepts light or dark and defaults to light. Calling the initializer again replaces the current widget. The returned handle has a destroy() method to remove it.',
          ],
          code: '<script\n  src="YOUR_PUBLISHED_WIDGET_SCRIPT_URL"\n  async\n  onload="window.injectChat({api_key: \'YOUR_BOT_WIDGET_KEY\', theme: \'dark\'})"\n></script>',
        },
      ),
      section(
        'widget-route-visibility',
        'Choose which website routes show the widget',
        {
          paragraphs: [
            'Open Bot Configuration → Interactions → Widget visibility and choose On all routes, Only on these routes, or On all routes except these. Existing bots default to all routes. For either restricted mode, enter at least one path, with one path per line and at most 50 paths.',
            '/pricing matches that page. /products/* matches /products and its subpages, but not /products-old. /* matches every path. Matching is case-sensitive and ignores trailing slashes, query strings, and fragments. Enter paths without a domain, query, or fragment. Hash fragments are not treated as separate routes.',
            'The widget fetches saved settings before showing chat. Disallowed pages do not mount chat or authenticate a chat session. If the initial configuration cannot be fetched, the widget stays hidden and retries. Saved settings refresh on page loads, route changes, returning to the tab, reconnecting to the network, and every 30 seconds while the page is visible. Exact paths, pushState, replaceState, and browser back/forward navigation are supported. Temporary network failures preserve an existing chat; revoked keys or invalid visibility settings hide it.',
            'Reload the host website after saving new dashboard rules; configuration is fetched once per widget installation. These rules control display, not access authorization.',
          ],
          links: [
            link('Configure bot interactions', '/dashboard/bot/interactions'),
          ],
        },
      ),
      section('verify-installation', 'Check the actual website', {
        steps: [
          step(
            'Open a fresh website session',
            'Use the intended production or staging domain. Confirm the launcher appears and the chat can open.',
          ),
          step(
            'Confirm identity',
            'Check institute, bot name, avatar, theme, support team, hours, email action, and help link.',
          ),
          step(
            'Verify interaction',
            'Ask a known factual question, complete the configured contact form, and check the resulting enquiry in the dashboard. Test chats consume reply allowance.',
          ),
          step(
            'Verify support',
            'Request a counsellor while a teammate watches the dashboard, and test a visitor attachment below 5 MB.',
          ),
          step(
            'Check mobile',
            'Make sure the launcher, form, composer, and close control are usable on a small screen and do not cover essential website controls.',
          ),
        ],
      }),
      section('key-maintenance', 'Rotate and revoke keys carefully', {
        paragraphs: [
          'The trash action in the active-key list revokes that key. Any website still using it can no longer establish new authenticated widget sessions with it. Existing session behavior is separate, so do not promise instant removal of every already-open chat.',
          'If the key was not saved, generate a replacement; the old plaintext cannot be recovered from the list. Update and verify the website before revoking a working key.',
          'A widget key is intended to be used by the website client. It is not a dashboard login or a provider secret. Never put an AI provider secret, signing key, or staff authentication token in the embed configuration.',
        ],
        links: [
          link(
            'Connection troubleshooting',
            '/docs/troubleshooting#connection',
          ),
        ],
      }),
    ],
  },
  {
    slug: 'conversations-and-leads',
    title: 'Work with conversations and chat history',
    navLabel: 'Conversations & attachments',
    eyebrow: 'Support workspace',
    category: 'Operate',
    description:
      'Find the right enquiry, inspect its chats, understand disabled controls, and hand a thread over to staff.',
    menu: 'Users → Conversations',
    access: 'Organization members',
    sections: [
      section('lead-inbox', 'Find the right conversation', {
        paragraphs: [
          'The conversation workspace groups chats into a Lead inbox. One lead can have several conversations, so the number of entries and the number of chats need not match. A lead card shows a selected chat, not necessarily the only chat for that person.',
          'Use Open, All, Closed, and Archived to select the status you need. Use the search field to narrow the inbox. Open Lead overview & chat history to inspect every chat for the selected lead.',
        ],
        image: image(
          'conversations',
          'Conversation workspace with arrows to status filters, lead inbox entries, chat history, and closed-chat state. Contact details are hidden.',
          'Closed chats have a disabled composer. Open an active thread to reply.',
        ),
      }),
      section(
        'history-and-summaries',
        'Separate chat history from the consolidated lead',
        {
          paragraphs: [
            'Lead overview & chat history combines current lead details, the consolidated lead summary, and individual conversations, newest first. Open chat switches to the full transcript for that conversation.',
            'Conversation summary describes a particular chat. The consolidated lead summary combines information across chats and refreshes after closure. Neither should replace the transcript when facts, consent, or commitments matter.',
            'Summary generation runs in the background after closure. A pending or unavailable summary does not mean the transcript disappeared. Refresh saved information to reload persisted details; this is not a command to invent or regenerate missing facts.',
          ],
          image: image(
            'conversation-history',
            'Lead overview dialog with arrows to current details, consolidated summary, and chat history.',
            'Check the specific chat when a summary and the latest visitor message appear to disagree.',
          ),
        },
      ),
      section('join-and-reply', 'Join and respond as a person', {
        image: image(
          'conversation-join',
          'An open conversation with arrows to Join conversation, Close conversation, and lead history.',
          'These controls appear on an open thread. Staff must join before replying.',
        ),
        steps: [
          step(
            'Read the thread first',
            'Check what the visitor asked, what the assistant already said, and whether contact consent was provided.',
          ),
          step(
            'Check the conversation is open',
            'Closed and archived chats are history. An open eligible thread offers Join conversation; a closed thread does not.',
          ),
          step(
            'Choose Join conversation',
            'Wait for the joined/connected state before sending. Opening the transcript or reading the notification is not joining.',
          ),
          step(
            'Respond through the composer',
            'Verify the message appears in the thread. If the connection is still Connecting or fails, do not assume delivery.',
          ),
          step(
            'Close when complete',
            'Use Close conversation when the work is finished. A visitor’s request to end a human chat appears as a request for staff to resolve.',
          ),
        ],
        links: [link('Handoff states and timeout', '/docs/counsellor-handoff')],
      }),
      section('attachments', 'Review visitor attachments', {
        paragraphs: [
          'The widget paperclip accepts supported documents and images below 5 MB. The dashboard renders image previews or file links according to the attachment type. The file remains associated with its conversation and consumes shared uploaded-file storage.',
          'An uploaded attachment is for support review. It is not automatically an approved training source and is not a managed bot-servable resource. Review it before using its contents to advise a visitor.',
          'If a filename is already used within that conversation, the upload service asks for a different name. For an unavailable or expired attachment, request a new copy through your normal support process rather than assuming the preview is the full record.',
        ],
        links: [
          link(
            'Attachment formats and shared storage',
            '/docs/storage-and-limits#visitor-attachments',
          ),
        ],
      }),
      section(
        'closure-and-archive',
        'Closed, archived, and inactive conversations',
        {
          paragraphs: [
            'Closed chats stop accepting normal messages in that thread. The ended label distinguishes visitor, staff, and system closure where that information is available. A disabled send box in a closed chat is expected.',
            'Archiving changes organization of historical records; it is not the same as deleting a transcript or changing retention. Use the status filters and chat history before assuming a record is missing.',
            'A scheduled task closes open conversations after about 15 minutes without messages, checked periodically. It excludes a currently requested handoff. The exact observed closure time depends on the scheduler, so it is not a countdown displayed to visitors.',
          ],
        },
      ),
    ],
  },
  {
    slug: 'leads-and-follow-ups',
    title: 'Review leads and carry out follow-ups',
    navLabel: 'Leads & follow-ups',
    eyebrow: 'Admissions operations',
    category: 'Operate',
    description:
      'Turn captured contact details into a clear enquiry record and an accountable follow-up without treating AI summaries as confirmed commitments.',
    menu: 'Users → Leads → select an enquiry',
    access: 'Organization members',
    sections: [
      section('lead-list', 'Start with the lead inbox', {
        paragraphs: [
          'Leads are enquiry profiles captured from the visitor workflow. A profile can accumulate details across more than one conversation. Search by name, email, phone, or bot, and use pagination to find the right person before editing.',
          'Check bot, course interest, status, priority, and available contact details. The same person’s older chat may contain facts that have since been corrected.',
        ],
        image: image(
          'leads',
          'Lead list with arrows to search, Add lead, and the link to a lead profile. Contact details are hidden.',
          'Use the profile and its conversation history together when deciding the next action.',
        ),
      }),
      section('manual-and-export', 'Manual leads, selection, and exports', {
        paragraphs: [
          'Add lead creates a manually recorded enquiry. Enter at least an email address or phone number, and record consent accurately. This does not establish that the person chatted with the bot.',
          'The header checkbox selects leads on the current page, not every result across all pages. Administrative bulk removal acts on the selection; check it carefully before confirming.',
          'Choose the Export format in the lead list and select Export to download lead records. Check your filters and selected records before exporting, and store the file securely. For a broader organization backup, use Subscription → Export records.',
        ],
      }),
      section('lead-profile', 'Read the profile before contacting anyone', {
        bullets: [
          'Check the current name, email/phone, enquiry topic, programme, education, preferred study mode, joining timeline, budget, and stated constraints where supplied.',
          'Distinguish the enquirer from the student. A parent or guardian may be asking on someone else’s behalf.',
          'Read contact consent and the latest correction in the conversation. An email address alone does not establish permission for every outreach channel.',
          'Treat the summary as a navigation aid. Verify consequential facts against the transcript and institute policy before making a promise.',
        ],
        image: image(
          'lead-detail',
          'Synthetic QA lead profile with arrows to contact/consent information, enquiry details, and profile editing.',
          'Review saved facts and consent before taking action. A summary can lag behind the most recent conversation.',
        ),
      }),
      section('follow-up-workflow', 'Record a follow-up and complete it', {
        steps: [
          step(
            'Choose the next useful action',
            'Examples include a callback, course-details email, application follow-up, demo, or campus visit. Match it to the visitor’s actual request.',
          ),
          step(
            'Create the follow-up record',
            'Use the follow-up area on the lead profile. Set the type, owner, timing, status, and notes using the controls available.',
          ),
          step(
            'Carry out the action',
            'A saved follow-up record is internal tracking. It does not itself place a call, send an email, or confirm a visit with the visitor.',
          ),
          step(
            'Update the result',
            'Record completion or the reason it remains pending. Correct the lead details when the visitor provides a newer confirmed fact.',
          ),
        ],
        image: image(
          'lead-follow-ups',
          'Lead follow-up section with arrows to adding and reviewing a follow-up.',
          'Assign responsibility and record outcomes; do not treat a planned action as a completed commitment.',
        ),
      }),
      section(
        'summary-and-corrections',
        'Handle corrections and uncertain details',
        {
          paragraphs: [
            'Use the profile’s edit controls for verified corrections. Some summary content is generated and read-only; changing a structured field is different from editing an AI-generated history.',
            'If the summary looks stale, check whether the relevant conversation has closed and whether background summarization completed. Review the full chat before making a manual correction.',
            'Limitations such as transcript retention and lead retention apply to this workspace too. Keep the records needed for your admissions process before cleanup deadlines.',
          ],
          links: [
            link(
              'Conversation history',
              '/docs/conversations-and-leads#history-and-summaries',
            ),
            link('Retention and export', '/docs/storage-and-limits#retention'),
          ],
        },
      ),
    ],
  },
  {
    slug: 'counsellor-handoff',
    title: 'Handle requests for a human counsellor',
    navLabel: 'Human handoff',
    eyebrow: 'Live support',
    category: 'Operate',
    description:
      'Understand requesting, joining, timeouts, reconnecting, and ending a human conversation.',
    menu: 'Notifications or Users → Conversations → open thread',
    access: 'Organization members handling support',
    sections: [
      section(
        'prepare-the-team',
        'Prepare the team before offering live help',
        {
          bullets: [
            'Give staff organization accounts with the access needed for conversations. There is no separate counsellor membership role.',
            'Agree who watches handoff notifications during staffed hours. Keep the dashboard open and the network available.',
            'Configure the support team name, email, hours/time zone, and realistic reply estimate in Interactions.',
            'Explain the fallback when nobody is available. Do not promise instant human help solely because the widget displays a schedule.',
          ],
          links: [
            link(
              'Configure support fields',
              '/docs/chatbot-customization#support-settings',
            ),
          ],
        },
      ),
      section('handoff-states', 'What happens during handoff', {
        table: {
          columns: ['State', 'What the team should do'],
          rows: [
            [
              'Requested / searching',
              'The visitor has requested a person. A dashboard notification is created for organization members. Open the correct thread promptly.',
            ],
            [
              'Viewed',
              'Reading the notification or transcript can mark the alert read, but does not connect a counsellor.',
            ],
            [
              'Accepted / connected',
              'A staff member uses Join conversation. Wait for the connected state, read the context, and respond as the counsellor.',
            ],
            [
              'Timed out / busy',
              'No eligible acceptance completed before the configured timeout. The widget shows an unavailable/busy outcome; arrange follow-up through the available support process.',
            ],
            [
              'Closed',
              'The conversation ended. The composer is disabled and summaries may be generated in the background.',
            ],
          ],
        },
        image: image(
          'notification-menu',
          'Notification bell and the current empty menu with arrows to the notification area and full list.',
          'Open a handoff notification to review the conversation and connect a counsellor.',
        ),
      }),
      section(
        'timeout-and-reply-estimate',
        'The timeout is different from your reply estimate',
        {
          paragraphs: [
            'The service default handoff timeout is 180 seconds, and deployment configuration can change it. The Typical human reply time field is only a displayed estimate; changing that field does not change the service timeout.',
            'Staff availability and support hours are not a guaranteed routing or staffing system. If a handoff times out, review the visitor’s request and consent and use the appropriate follow-up route.',
          ],
        },
      ),
      section('connection-and-ownership', 'Connection and ownership matter', {
        paragraphs: [
          'Only claim a chat if you can respond. A colleague opening the same conversation should inspect its current state rather than assume a second independent support session.',
          'If you reload or lose the network, wait for reconnection and check the joined/connected state. A disconnected socket can prevent sending even while the transcript remains visible.',
          'When a visitor asks to end a human conversation, the dashboard shows an end-chat request. Use Close conversation after completing any final response. Reading or clearing the alert alone does not close the chat.',
        ],
        links: [
          link(
            'Conversation controls and history',
            '/docs/conversations-and-leads',
          ),
          link(
            'Live notification fallback',
            '/docs/notifications#live-update-fallback',
          ),
        ],
      }),
      section('handoff-test', 'A useful handoff rehearsal', {
        steps: [
          step(
            'Use a test visitor journey',
            'Ask a normal admissions question, then request a person. Test replies count toward usage.',
          ),
          step(
            'Watch the dashboard',
            'Confirm that the notification reaches the intended workspace and opens the right thread.',
          ),
          step(
            'Join from the staff account',
            'Check the visitor sees the connected human-support state and can exchange messages.',
          ),
          step(
            'Check the fallback',
            'During a controlled test, leave a request unanswered and verify the timeout message and support contact route.',
          ),
          step(
            'Finish the chat',
            'Close it, check the ended state on both sides, and allow time for the summary to complete.',
          ),
        ],
      }),
    ],
  },
  {
    slug: 'markdown-responses',
    title: 'Keep chat answers readable',
    navLabel: 'Readable answers & links',
    eyebrow: 'Conversation quality',
    category: 'Configure',
    description:
      'Use simple structure, meaningful links, and source-backed answers that fit the visitor’s chat window.',
    sections: [
      section('formatting', 'Use the formatting the widget can display', {
        bullets: [
          'Put the direct answer first, then a few bullets or numbered next steps.',
          'Use bold for a short key phrase and meaningful link text for a destination.',
          'Use short paragraphs and simple lists rather than wide tables or long policy dumps.',
          'Keep cited source references tied to the facts they support. The widget can display source-linked answers where supplied by the backend.',
          'An external link is not a managed resource file. Verify that the page or download is public and appropriate before adding it to approved knowledge.',
        ],
      }),
      section('example-answer', 'A concise admissions answer', {
        code: '**Application steps**\n\n1. Review the published eligibility requirements.\n2. Complete the institute’s official application form.\n3. Submit the documents listed in the current intake guide.\n\nFor exceptions or an individual eligibility decision, contact admissions.',
        paragraphs: [
          'Use only steps supported by your approved source. Do not include a fictional fee, deadline, application URL, scholarship, or admissions guarantee simply to make an answer look complete.',
        ],
      }),
      section('quality-check', 'Check it in the actual widget', {
        paragraphs: [
          'Review the answer on desktop and mobile. Confirm that links open correctly and that important conditions are not hidden beneath a long block of text.',
          'If a factual answer is wrong, fix the training source or investigate retrieval. Changing formatting or tone alone does not correct missing or contradictory evidence.',
        ],
        links: [
          link('Training best practices', '/docs/training-best-practices'),
        ],
      }),
    ],
  },
  {
    slug: 'launch-checklist',
    title: 'Launch and maintain the assistant',
    navLabel: 'Launch & maintenance',
    eyebrow: 'Operational checklist',
    category: 'Start here',
    description:
      'A focused checklist for first launch, a new intake, and routine team maintenance.',
    sections: [
      section('before-launch', 'Before the first visitor', {
        bullets: [
          'Confirm the organization, active plan, bot allowance, source count, and remaining reply/training/storage capacity.',
          'Review identity, business description, greeting, support contact, hours/time zone, and reply estimate.',
          'Train current approved sources, resolve failures, and test common questions plus unsupported and ambiguous questions.',
          'Verify lead capture timing and fields in a fresh session. Check the lead profile and contact-consent handling.',
          'Have a teammate receive and accept a handoff. Check timeout and connection-loss behavior.',
          'Check the widget URL and bot-specific API key, initialize the widget once, and test your website on desktop and mobile.',
          'Check support email and help links. Keep original source files and the website integration configuration safely.',
        ],
      }),
      section('daily-support', 'During staffed hours', {
        bullets: [
          'Keep the dashboard open and review Open conversations and unread alerts.',
          'Join handoffs only when able to respond. Check the connection before assuming delivery.',
          'Review new leads, confirm contact consent, and assign the next follow-up.',
          'Monitor Subscription for reply/storage pressure, payment issues, and upcoming renewal or pack expiry.',
        ],
      }),
      section('new-intake', 'Before a new intake or policy change', {
        steps: [
          step(
            'Collect approved changes',
            'Obtain the current fees, deadlines, courses, eligibility conditions, scholarship rules, and contact details from the responsible owner.',
          ),
          step(
            'Replace obsolete sources',
            'Keep external originals, remove contradictions, add the revised sources, and train them.',
          ),
          step(
            'Retest changed facts',
            'Compare answers with the new approved documents, including exceptions and questions about older intakes.',
          ),
          step(
            'Update the visitor-facing settings',
            'Review greeting, support schedule, help links, and contact-capture messages if operations changed.',
          ),
          step(
            'Review staff and retention',
            'Remove obsolete memberships and website keys when safe, check seat capacity, and export records needed before retention cleanup.',
          ),
        ],
      }),
      section('review-cycle', 'Keep a small review routine', {
        paragraphs: [
          'Each week, review a sample of unanswered or incorrect questions and follow-up outcomes. Fix the source responsible for a gap, then rerun the relevant questions.',
          'Before renewal or a downgrade, review account capacity and pending invitations. Before retention deadlines, export the records your team still needs.',
        ],
        links: [
          link('Troubleshooting by symptom', '/docs/troubleshooting'),
          link(
            'Billing and renewal changes',
            '/docs/billing-and-subscriptions',
          ),
        ],
      }),
    ],
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting: symptom to next action',
    navLabel: 'Troubleshooting',
    eyebrow: 'Get unstuck',
    category: 'Operate',
    description:
      'Use the visible symptom to find the next check, without repeating uploads, payments, or configuration changes blindly.',
    sections: [
      section('access', 'Missing workspace, bot, or controls', {
        table: {
          columns: ['Symptom', 'Check and next action'],
          rows: [
            [
              'Bot or lead missing',
              'Check the organization selector, selected bot, and conversation status filter. Look in chat history before assuming a record was deleted.',
            ],
            [
              'Invite or billing controls unavailable',
              'Check your organization role. Ask an Owner for billing access or an Owner/Admin for membership management. Signing in does not grant those permissions.',
            ],
            [
              'New organization has no trial',
              'The admin may already have claimed their one trial. Check Subscription rather than repeatedly creating organizations.',
            ],
            [
              'Cannot add an organization',
              'Check your organization allowance and account access. Open Add organization from the selector, complete all required details, and review any validation message before retrying.',
            ],
            [
              'Key disappeared after closing its dialog',
              'Plaintext keys are shown once. Generate and install a replacement if you did not save it, then revoke the old key when safe.',
            ],
          ],
        },
      }),
      section('training-failed', 'Upload or training failed', {
        table: {
          columns: ['Symptom', 'Check and next action'],
          rows: [
            [
              'Unsupported file',
              'Use PDF, DOCX, CSV, TXT, Markdown, or HTML. Convert legacy DOC and spreadsheet workbooks to a supported format.',
            ],
            [
              'File too large',
              'Keep dashboard training files below 10 MB and select at most 10 at a time. The plan’s per-file ceiling, shared storage, and extraction limits still apply.',
            ],
            [
              'PDF has no usable text',
              'OCR is disabled. Convert the scan to a text-based document and inspect its readability before retrying.',
            ],
            [
              'CSV parsing error',
              'Use UTF-8, unique non-empty headers, consistent column counts, and proper quoting. Split an oversized field.',
            ],
            [
              'URL rejected or returns no content',
              'Use a simple public HTML page URL. Avoid login-only pages, script-only content, and download links. Upload a document file directly when appropriate.',
            ],
            [
              'URL already exists',
              'The source is already attached to this bot. Remove and re-add it only when deliberately refreshing the page.',
            ],
            [
              'Training already in progress',
              'Wait for queued/running jobs to finish. Do not repeatedly submit or remove an active source.',
            ],
            [
              'Remove or retry button disabled',
              'Check for an active job or loading state, then review the submission terms. The current screen requires agreement for these controls as well as Train Bot.',
            ],
            [
              'Training error information is visible',
              'Open it and read the latest stage, suggested action, and resolved state. Retry this source after correcting the cause; old error history may remain after success.',
            ],
            [
              '100% progress but answers missing',
              'Check the Failed count and per-source status. Completion includes failures. Test that the question’s answer actually exists in a trained source.',
            ],
            [
              'Training allowance exhausted',
              'Distinguish active corpus capacity from this-cycle training usage. Removing sources does not refund completed training work.',
            ],
          ],
        },
        links: [
          link('Training workflow', '/docs/institute-knowledge'),
          link(
            'Storage and quota recovery',
            '/docs/storage-and-limits#free-capacity',
          ),
        ],
      }),
      section('answer-quality', 'An answer is wrong, stale, or uncertain', {
        steps: [
          step(
            'Check the correct bot and session',
            'Confirm the website uses the intended bot/key, and use a fresh session after configuration changes.',
          ),
          step(
            'Check the source',
            'Look for the precise answer, intake/date, conditions, and programme in approved material. Resolve contradictory versions.',
          ),
          step(
            'Check training',
            'Confirm the intended version is Trained. Adding or uploading a source is not the same as training it.',
          ),
          step(
            'Check references and hand off',
            'Compare cited evidence with the actual claim. For consequential or individual decisions, have staff confirm the answer.',
          ),
        ],
      }),
      section(
        'connection',
        'Widget, messages, or live updates do not connect',
        {
          table: {
            columns: ['Symptom', 'Check and next action'],
            rows: [
              [
                'Widget does not appear',
                'Verify the deployed script URL and loading order, an active bot-specific API key, route visibility settings, and that initialization runs once. Copy the installation code again from API Setup if its configuration has changed.',
              ],
              [
                'Authentication failed',
                'Check that the key is active, saved correctly, and associated with the intended bot. Do not use a provider secret or dashboard token as a widget key.',
              ],
              [
                'Identity or greeting appears stale',
                'Start a new visitor session after saving changes. Existing chat sessions can retain earlier configuration.',
              ],
              [
                'Composer disabled',
                'Complete a visible contact form. In the dashboard, check whether the conversation is closed or you have not joined it.',
              ],
              [
                'Chat says Connecting',
                'Wait for the connection and verify the joined state before sending. Reload after connectivity recovers; notification refresh is a separate channel.',
              ],
              [
                'Live updates temporarily unavailable',
                'Notifications still refresh about every 30 seconds. Reload the dashboard to reconnect instant updates, and check the conversation’s own connection state.',
              ],
              [
                'Busy / rate limited',
                'Wait and retry after a short pause. Deployment traffic limits and concurrency safeguards can apply even when reply allowance remains.',
              ],
              [
                'Attachment rejected',
                'Use the widget’s supported formats below 5 MB. Rename a duplicate filename and check remaining organization storage.',
              ],
            ],
          },
        },
      ),
      section('billing', 'Usage, payment, or invoice problems', {
        table: {
          columns: ['Symptom', 'Check and next action'],
          rows: [
            [
              'Checkout pending',
              'Use Refresh payment status. Do not repeatedly create payments while confirmation is unresolved.',
            ],
            [
              'Payment failed',
              'Read the provider’s reason, correct the payment method, and use the offered retry flow. A checkout return is not proof of payment.',
            ],
            [
              'Upgraded plan not active',
              'A renewal-plan change applies after the next successful collection. Check the pending plan and access dates.',
            ],
            [
              'Downgrade blocked',
              'Reduce seats including eligible invitations, bots, files, oversized files, sources, and active knowledge to the smaller plan’s limits.',
            ],
            [
              'AI replies exhausted',
              'On an eligible active paid plan, consider an appropriate reply pack. It adds replies only and does not renew expired access.',
            ],
            [
              'PDF invoice unavailable',
              'Check whether seven days have passed since payment. Open the Receipt record in the meantime.',
            ],
          ],
        },
        links: [
          link('Billing and subscriptions', '/docs/billing-and-subscriptions'),
        ],
      }),
      section('contact-support', 'Give support the details that help', {
        bullets: [
          'Organization and bot name, the affected menu, and a short description of the expected versus actual behavior.',
          'The exact visible error, its time, the source filename/URL or relevant conversation reference, and whether it repeats.',
          'A screenshot with personal details, full keys, signing tokens, and payment details hidden.',
          'For training failures, include the latest error stage and suggested action; for payments, include the visible status without sharing payment credentials.',
        ],
        paragraphs: [
          'Use Feedback in the dashboard to report a product issue. The support email configured inside a bot is your institute’s visitor contact; it is not automatically the platform’s technical-support address.',
        ],
      }),
    ],
  },
]

export const docsNav = docsPages.map((page) => ({
  href: page.slug ? '/docs/' + page.slug : '/docs',
  label: page.navLabel,
  category: page.category,
  description: page.description,
}))
export function getDocPage(slug: string) {
  return docsPages.find((page) => page.slug === slug)
}
