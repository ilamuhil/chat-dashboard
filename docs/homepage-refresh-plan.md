# Homepage and contact page refresh

## Goal and audience

Help admissions decision-makers at colleges, training institutes, and course providers understand the product, assess its fit, and either start a trial or contact the team. Preserve the existing AI Chat Bot name and blue brand palette.

## Research completed before implementation

Reviewed the professional homepages at [Intercom](https://www.intercom.com/), [Chatbase](https://www.chatbase.co/), and [Tidio](https://www.tidio.com/), plus the [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide). Pages checked on 29 October 2026.

The reusable patterns are a clear customer outcome, an early product demonstration, specific explanations of the workflow, and a direct next action. The implementation uses original writing and illustrations. Competitor capabilities, statistics, logos, certifications, and testimonials are not evidence about this product and are not reused.

Google's guidance supports useful original content, descriptive headings and titles, natural reader vocabulary, crawlable links, and accurate descriptions. Keyword choices here are hypotheses based on product fit; no search-volume data or ranking claims were available.

## Product evidence

Inspected clean local main branches: chat-dashboard at 349ed7d, chat_api at b4f8078, and chat_widget_ui at 95a52dc.

- Approved institute answers and citations: chat_api/app/agent/edu_agent.py and its retrieval flow. The assistant retrieves reference information, avoids unsupported factual guarantees, and can offer human help.
- Knowledge sources and training: dashboard training UI and lib/docs.ts. Supported sources are PDF, DOCX, CSV, TXT, Markdown, HTML, and individual public HTML pages. Legacy .doc, image-only OCR, automatic whole-site crawling, and continuous synchronization are not claimed.
- Contact capture: bot interaction settings, backend lead capture, and the visitor widget. Configurable contact fields, timing, and contact consent are part of the journey.
- Human handoff: backend handover state and dashboard conversation UI. Team notification, acceptance, and joining are supported; live staff availability is required.
- Lead management: dashboard lead list, lead detail, history, summaries, and follow-up records. Follow-ups track work; they do not automatically call a student or send a campaign.
- Website widget: widgetConfig.ts and src/embeding/inject.ts. A maintainer installs the published script, bot ID, and widget key. Configuration and training use the dashboard.
- Customization: bot identity, greeting, tone, avatar, light/dark widget theme, support email, team name, reply estimate, and support hours.
- Team and usage: organization membership with admin/editor roles; plan limits shared by organization; records export.
- Trial: lib/billing/catalog.ts and existing pricing route. Eligible accounts: 14 days, 1 bot, 1 member, 5 sources, and 100 replies. No card required per the current signup/pricing flow.

## Content and design plan

1. Lead with an outcome: “Every student question. A better next step.” State the AI admissions chatbot category immediately above it and explain institute knowledge, leads, and counsellors beneath it.
2. Demonstrate the experience early. Three keyboard-accessible tabs illustrate answering with evidence, capturing an enquiry, and connecting to a human. All sample content is explicitly fictional; it is not a live assistant.
3. Build a coherent product story. Large knowledge and lead-management sections explain the student and team benefits. A contrasting team-workspace section explains human handoff. Six supporting capabilities cover customization, communication, support expectations, team access, follow-ups, and capacity.
4. Explain setup honestly. Add sources, configure/train, install/test. Keep the detailed installation guide one click away.
5. Replace the old FAQ. Answer buying and operating questions about supported answers, actionable leads, human support availability, installation, intake updates, multiple bots, and the trial. Link each answer to a relevant guide.
6. Keep the conversion path clear. Primary action: start a trial. Secondary action: explore the product, then contact the team when a conversation is more useful.
7. Replace the duplicate homepage navigation destination. Features remains an anchor; remove How it works and add /contact with matching desktop and mobile navigation.
8. Create a customer-friendly contact page. Optional website, no phone requirement, useful topic selection, concise context request, contact consent, direct email fallback, honest delivery states, and accessible feedback.

## SEO plan implemented

- Primary topic: AI admissions chatbot.
- Supporting vocabulary: student enquiries, admissions lead management, colleges and academic institutes, counsellor handoff, institute knowledge, website chat widget.
- Page-specific title, description, canonical URL, Open Graph, and Twitter metadata.
- One H1 per page, descriptive H2/H3 structure, meaningful internal links.
- Server-render homepage and contact content immediately; remove the artificial client-side marketing loading screen.
- SoftwareApplication and FAQ structured data matching the visible product and questions. ContactPage structured data for the new route. FAQ markup does not imply eligibility for a Google rich result.
- Add contact and pricing to the sitemap; derive documentation URLs from the actual guide catalog. Retain private-route crawl restrictions.
- Generate a branded social preview with native HTML-style layout, without an external image request.

## Delivery and configuration

The existing site belongs to the Next.js chat-dashboard repository. Sites returned no existing hosted site. Do not create a disconnected replacement, change hosting, or publish private application code as a new Site merely to deliver these edits.

Contact enquiries and dashboard feedback share ilamuhil@gmail.com as requested. Change DEFAULT_CONTACT_EMAIL in lib/marketing.ts, or set CONTACT_EMAIL in the deployment. Footer and policy contact addresses use the same configuration. CONTACT_EMAIL is optional and overrides the shared contact and feedback inbox; it is not needed for the Gmail default. Delivery reuses the existing Resend integration and requires RESEND_API_KEY plus an approved RESEND_FROM_EMAIL. The server sends only after validation, body-size checks, consent, origin checks, a honeypot check, and best-effort per-instance rate limiting. High-volume production traffic can additionally use host-level limits; the in-process limiter is not a distributed guarantee.

Configure APP_URL or NEXT_PUBLIC_APP_URL to the real public origin before publication so canonicals, sitemap URLs, and structured data use the production hostname. Do not leave the localhost development fallback in production.

## Verification

Check the production build and TypeScript; run the contact handler tests with mocked delivery; inspect desktop and mobile pages, navigation, tabs and keyboard controls, FAQ disclosure, native form validation, delivery failure, retained input, and email fallback. Verify response HTML includes the main content without requiring JavaScript, metadata is page-specific, schema matches visible FAQs, social preview renders, and all local links resolve. Do not send test enquiries to the real inbox without authorization.

## Completed verification — 29 October 2026

- Production build completed successfully in the original chat-dashboard checkout, including TypeScript and generation of all 79 static-page build entries.
- Six contact-handler tests passed with mocked email delivery: successful recipient/reply-to and HTML escaping; invalid fields, consent, spam and cross-origin rejection; malformed and oversized bodies; normalized Next.js host handling; throttle/reset; provider failure.
- Desktop and 390px mobile browser checks covered homepage/contact layout, no horizontal overflow, mobile navigation, distinct Contact destination, the three demo tabs, keyboard navigation, FAQ expansion, native required-field validation, delivery failure, retained form input, and the direct-email fallback.
- Inspected generated production HTML: substantive content is present without JavaScript; each marketing page has one H1 and a valid skip-link target; seven structured FAQ answers match the visible answers; all 23 local homepage/contact links and fragments resolve.
- Sitemap includes contact, pricing, and the full current documentation catalog. Generated social preview is a valid PNG.
- React component check: static marketing content remains in server components; interactivity is confined to the header, demo, and form; tab selection has keyboard focus management; form progress/errors are accessible; reduced-motion preferences are respected; no added animation library or dependency.
- No real email was sent. The existing repository has Resend key and sender configuration; live provider acceptance remains to be verified during release. No source was pushed, no new hosted Site was created, and no production deployment was performed.
