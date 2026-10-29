# Product handbook: coverage and maintenance plan

Reviewed 29 October 2026. This plan accompanies the user-facing `/docs` rewrite.

## Outcome

Replace broad admissions advice with task guides that explain actual menus, permissions, field meanings, limits, expected results, and recovery steps. Preserve the existing documentation URLs. Use real browser captures with visible arrows; do not fabricate product screenshots. The handbook describes the launch feature set, including the features the owner will finish before going live.

## Where users need help

1. **Account boundaries:** login versus organization membership; selecting the correct organization; organization-owned data and shared capacity; one trial claim per eligible administrator.
2. **Team onboarding:** admin/editor scope, real invitation behavior, seat reservation, magic-link expiry versus onboarding-invite expiry, and safe access transfer.
3. **First bot:** a short sequence from organization and capacity through configuration, training, installation, and a visitor-journey check.
4. **Configuration decisions:** identity and persona versus membership roles; all form fields and validation; support contacts, time zones, reply estimates, messages, and contact-capture timing.
5. **Knowledge preparation:** actual formats, readable PDFs without OCR, modern DOCX, CSV headers/encoding/quoting, topical structure, policy dates and conditions, and conflicting versions.
6. **Knowledge operations:** upload verification versus training, batch results, error history, retries, duplicates, refresh/replacement, and removal constraints.
7. **Storage and limits:** training originals, conversation attachments, bot-servable resources, shared bytes, per-file limits, source count, active corpus, cycle training work, and capacity recovery.
8. **Commercial decisions:** standard plans, account-specific entitlements, test-chat usage, reply packs, expiry, pending payment, renewal failure, grace, scheduled plan changes, downgrade constraints, invoices and export.
9. **Website installation:** bot-specific keys shown once, the website embed panel, widget initialization interface, deployment-specific script loading, and visitor checks.
10. **Daily support:** grouped lead inbox, individual chat history, summary freshness, open/closed/archived states, joining, connection state, attachments, closure and inactivity.
11. **Follow-up:** current profile versus historical summaries, enquirer/student distinctions, consent, manual leads, record edits, assignment, scheduling, and completed outcomes.
12. **Notifications:** personal read state, bell/full-list navigation, meaningful action versus marking read, persistent alerts, live delivery, and 30-second polling fallback.
13. **Maintenance:** launch rehearsal, daily work, intake/policy changes, access reviews, renewal/capacity reviews and retention exports.
14. **Recovery:** symptom-to-action troubleshooting with exact destinations and links back to the relevant workflow.

## Source evidence

Review used the local running checkouts without pulling, changing branches, or editing the API/widget:

- `chat-dashboard` HEAD `036159a`: `prisma/schema.prisma`; `lib/billing/{catalog,service,payments,guards,maintenance,invoice}.ts`; `lib/{organization-members,current-organization,magic-link,support-hours,widget-profile}.ts`; organization/onboarding/auth, training upload/finalize/URL, attachment, notification and lead API routes; the matching dashboard clients and forms; `app/boot.tsx`; docs routes and renderer.
- `chat_api` HEAD `b4f8078`: `app/ingestion/pipeline.py`, converter factory, CSV/HTML/document parsers and errors; training workflow and cleanup; billing reservation, training accounting and retention services; agent handoff; WebSocket handover/handlers and conversation lifecycle; notification persistence and publication; database models.
- `chat_widget_ui` HEAD `95a52dc`: injection and configuration interfaces, profile/auth session setup, widget/header/composer/contact form/message components, socket and session behavior, and repository build configuration.

At review time the local dashboard and API were respectively four and three commits behind their existing remote-tracking `origin/main`. Those newer tracked commits concern signed admin model provisioning. The review preserves the local running version and directs new provisioning to administrators; it does not silently merge unrelated changes.

## Launch contract and maintainer checks

The owner requested launch-version documentation: planned features are written as normal product workflows, without implementation-status notices. This is a documentation target, not a claim that all launch work has already shipped in the reviewed commits.

Before publication, verify the documented workflows against the launch build:

- Create another workspace through Add organization, enforce the organization allowance, and switch memberships correctly.
- Download lead exports in the selected format with the intended filter/selection scope and permissions.
- Supply usable embed configuration for the chosen bot and test installation on a separate website.
- Upload, describe, replace, serve, and remove bot resource files. Confirm the documented storage contract: training originals, visitor attachments, and resources share the organization's Uploaded files allowance; source-count and token limits apply to training. Resource uploads must enforce the displayed per-file limit. No separate resource quota or format list has been invented.
- Preserve the documented training selection limits (10 files per batch, 10 MB in the training screen), visitor attachment cap (5 MB), plan ceilings, accounting, and retention behavior, or update the handbook alongside changes.
- Standard catalog values must agree with stored organization entitlements. Source deletion must not be described as refunding completed cycle training work.
- Keep follow-up tracking, message delivery, notification read state, and accepting a handoff as distinct actions.
- Screenshots use the running application. Empty notification states remain empty; no alerts or controls are manufactured. No invitations, billing actions, staff joins, keys, or follow-ups are submitted for images.

## Screenshot and content maintenance

- Keep only cropped, annotated, privacy-masked copies in `public/images/docs/`. The JSON manifest records the actual output dimensions for correct layout.
- Capture the application at 2× rendering density and crop to the relevant controls. Store progressive JPEGs with 4:4:4 color: quality 88 for the largest copy and 86 for responsive copies. Cap the largest width at 2200 pixels; supply 480/960-pixel variants where smaller than the original. Never upscale an existing screenshot.
- Numbered arrows live in the image. Directions, captions, and the Enlarge link are HTML for sharp, accessible, responsive text. Do not add screenshot banners or an Arrow guide heading.
- The browser chooses a JPEG from the explicit srcSet. Images load lazily, decode asynchronously, reserve their aspect ratio, and avoid a second lossy optimization pass. Check currentSrc at desktop/mobile widths before publishing.
- A changed menu label, permission, validation rule, quota, or processing state requires updating its guide and recapturing the affected screen.
- Use synthetic or anonymous records. Hide real contact information, account identity, billing values and transaction identifiers. Never put plaintext keys or sign-in links in docs assets.
- Plan comparison values are derived from `lib/billing/catalog.ts`; review the surrounding explanations whenever commercial behavior changes.
- Navigation metadata is passed from the server layout to the sidebar so the full handbook is not bundled into the client search component.

## Verification

The installed handbook contains 17 guides, 85 sections, and 28 annotated screenshots.

Run scoped lint and TypeScript checking, inspect every guide URL and image reference, check internal anchors, and review desktop/mobile navigation, search, tables, callouts and screenshot enlargement in the browser. Do not mutate billing, send invitations, generate keys, or create outreach merely to obtain screenshots. Record any pre-existing runtime limitation separately from docs validation.
