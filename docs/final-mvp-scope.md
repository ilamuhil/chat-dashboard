# Final MVP completion plan

Branches are explicitly excluded.

## Decisions

Use four roles: Owner, Admin, Counsellor, Viewer. Migrate existing Admins to Owners and Editors to Counsellors as authorized. Unknown roles fail closed. Owners control billing/subscriptions and ownership; Admins configure bots, training, institute details and ordinary memberships; Counsellors handle admissions and live conversations; Viewers have read-only operational access. Export is restricted to Owner/Admin. Operational records remain organization-scoped; no branch model is added.

Use per-bot capture settings, extending existing bot configuration with validated field definitions and required flags. Keep shared built-in lead fields; store custom answers with stable field identifiers. Avoid a workflow builder or a separate configuration service. Public forms and server validation must agree. Completion must be scoped to bot/conversation/configuration.

## Work sequence

1. Map page, API, server-action and token access. Add shared capability checks, guard ownership transitions and fail closed on unknown roles. Recheck role/membership for long-lived connections.
2. Implement CSV export of the entire filtered lead list, with tenant checks, reliable quoting and spreadsheet-formula neutralization.
3. Configure built-in capture and custom questions per bot. Validate in dashboard, chat API and widget; display accepted custom answers in lead profiles/export.
4. Add explicit return-to-AI for open human conversations using the existing handover version and live state channel. Fence old agent messages and preserve conversation history/status.
5. Finish opt-in hosted chat and safe source-reference rendering, including persisted history and streaming responses.
6. Verify role/capability combinations, token-purpose confusion, organization isolation, revoked sessions, last-owner races, CSV content, required-field changes, bot isolation, human/AI transitions, citation safety, and light/dark/mobile UI.

## Research

HubSpot maps each chatflow question to a contact property: https://knowledge.hubspot.com/chatflows/a-guide-to-bot-actions
Intercom separates defined custom qualification attributes from their collection: https://www.intercom.com/help/en/articles/1155528-define-the-right-qualification-data-for-your-business
For this application, per-bot configuration gives useful course/audience variation while extending the existing bot settings without inheritance rules or another service.


## Implemented behavior

| Area | Owner | Admin | Counsellor | Viewer |
| --- | --- | --- | --- | --- |
| Leads, follow-ups, notes, outcomes, human chat | Read/write | Read/write | Read/write | Read |
| Operational analytics and conversation history | Read | Read | Read | Read |
| CSV lead export | Yes | Yes | No | No |
| Bots, API keys, capture, hosted chat, ingestion/training, institute profile | Manage | Manage | No | No |
| Team membership | All roles | Counsellor/Viewer only | No | No |
| Billing, subscriptions, invoices and billing exports | Manage | No | No | No |

Membership is institute-wide. A different counsellor cannot return another active counsellor's chat to AI; Owner/Admin can. Sign-in and personal session actions remain available to the signed-in user. Branches remain excluded.

Each repository has exactly one canonical membership enum: dashboard `lib/organization/roles.ts`, API `app/core/roles.py`, widget `src/auth/roles.ts`. Serialized values are `owner`, `admin`, `counsellor`, `viewer`. There is no second Prisma/database role enum; existing text columns have role constraints. Token purposes (`access`, `user`, `support_agent`, `staff_read`, `dashboard_admin`, `sse`) and message actors are separate concepts. Organization-scoped staff tokens carry `organization_role` from the enum. Organization-independent login tokens and visitor tokens do not claim a staff role. The API checks current membership, active account and token-purpose capability, and rejects stale role claims. Long-lived agent operations and notification streams recheck access.

Capture is per bot: built-in visibility, required flags and up to eight text/number/choice/yes-no questions. Stable question IDs and accepted answer snapshots live in existing lead metadata. Hidden contact fields cannot become required. Consent remains optional. Returning visitors are checked against current requirements, including phone-only/custom-only capture. Bot-specific completion keys prevent one bot's form from completing another's. Conflicting settings saves return a reload message instead of overwriting another edit.

CSV includes the complete filtered lead set (up to 10,000 IDs), custom answers, ownership, priority reasons and outcomes. The server filters by institute and excludes deleted leads. Cells are quoted and spreadsheet formulas neutralized.

Return-to-AI leaves the conversation open, preserves the visitor connection/history and increments the handover version. Old agent writes are rejected. Source references are sanitized, persisted with answers, restored in history, and displayed in an expandable Sources list.

## Database and deployment

This final batch adds two JSONB columns: `bots.lead_capture_config` in the dashboard database and `messages.source_references` in the chat database. Role migration and assignment/last-Owner guards reuse existing membership and workflow tables. No branch tables or new service were introduced.

Applied dashboard migrations: `20261030180000_mvp_roles`, `20261030183000_bot_capture_config`, `20261030220000_assignment_roles`. Applied chat migration: `c4a21030f001_message_sources`. Regenerate the Prisma client and restart application processes after migration. Existing Admins become Owners; Editors become Counsellors.

Hosted chat is opt-in at `/chat/[bot_id]`; it uses a public bot identifier, never a private API key. Disabling publication blocks new public configurations and visitor-token issuance. Existing issued visitor tokens retain their normal short lifetime.

The hosted page uses `NEXT_PUBLIC_WIDGET_SCRIPT_URL` when set, otherwise `/chat-widget-ui.iife.js`. Build the widget with the intended `VITE_API_URL_BASE` and `VITE_CHAT_SERVER_URL`. Publish that bundle to the configured URL, or run `pnpm widget:sync ../chat_widget_ui/dist/chat-widget-ui.iife.js` in the dashboard before deployment. The generated local bundle is intentionally ignored by Git and lint. The localhost bundle was built and installed for this verification; do not deploy that localhost-targeted bundle to production.

## Verification

Tests cover the role matrix and invalid roles; token purpose separation and stale role claims; tenant-safe CSV and spreadsheet quoting; forbidden API actions and hidden Viewer controls; last-Owner/assignment guards; required capture values including false and zero; stale capture saves; consent-aware tasks, scoring, timeline, analytics and alerts; return-to-AI ownership/idempotency/closed-chat cases; safe citations and restored chat history; and phone-only returning visitors with bot/institute isolation.

Automated live checks use isolated synthetic institutes and users with cleanup. The two hosted browser previews and their synthetic records were retained at the user’s request. Email delivery tests mock the provider; no real test emails were sent. Browser verification covers capture editing in light/dark themes, hosted form submission without contact consent, per-bot form isolation, and saved citations. Source and build checks are recorded in the task's final result.


### Final verification results (30 October 2026)

- Dashboard: 20 tests passed, including PostgreSQL workflow and live HTTP boundary checks; additional stale-save, other-counsellor and Viewer UI assertions passed.
- API: 100 tests passed, including real PostgreSQL operations/locking tests and the phone-only returning-visitor regression.
- Widget: 52 tests passed.
- Dashboard and widget production builds passed. Type checks and lint passed; the API’s targeted undefined/unused-code check passed.
- Browser checks confirmed required fields, false/zero answers, optional consent, bot isolation, restored history/citations, light/dark capture settings and the narrow-layout breakpoint without horizontal overflow. The browser’s minimum effective viewport was 700px wide; a 390px phone viewport was not available through the current browser control.
- No commits, pushes or production deployments were performed.

Retained synthetic hosted previews:
- `/chat/934233f1-a7e9-4067-b751-3aa5282270ea`: phone and qualification questions; saved answers include `false`, `0`, and no contact consent; saved source-reference example.
- `/chat/d46370f4-7585-4480-bef1-5db656551579`: independently required email, demonstrating bot-level form isolation.

These previews belong to a separate synthetic institute; existing institute settings and records were not changed for the browser test.
