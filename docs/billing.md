# MVP billing

The dashboard database owns billing. Prisma migrations live here; `chat_api` reads the same tables through its SQLAlchemy mirror. Cashfree is configured for sandbox. Do not put provider credentials or sandbox auth fixtures in Git.

## Customer flow

- `/pricing`: public prices and limits, before signup.
- `/dashboard/subscription`: plan, usage, extra replies, scheduled plan changes and cancellation. Links to Billing & invoices.
- `/dashboard/billing`: required billing details, payment history, receipts and PDF downloads.
- `/dashboard/billing/invoices/[id]`: authorized payment receipt. Old subscription receipt URLs redirect here.
- A new subscription or reply-pack checkout requires a saved billing name, valid email, Indian phone number, complete address and Indian state. GSTIN is optional; when supplied, its state must match. Missing details route the customer to the billing page, then back to payment review. Server validation also blocks direct API bypasses.
- Checkout shows base value, applicable GST components and total before recurring-payment consent. A browser return never proves payment: the page reconciles with Cashfree and polls pending confirmation for up to two minutes.
- Receipts are immediate after verified collection. PDF invoices generate on demand and unlock seven days after payment. The download endpoint enforces this delay, administrator role and organization ownership. PDFs are not stored as files.
- Invoice seller, customer, price, tax and period come from immutable payment snapshots. Editing billing details affects future purchases, not historical invoices.
- Visitors never see AI allowance or billing messages. When AI cannot continue, the widget offers contact capture and a counsellor request. Dashboard usage warnings remain visible to staff.

## Versioned catalogue

Version `2026-10-16`; monetary values use integer paise. MB means 1,000,000 bytes.

| Limit | Trial (14 days) | Starter | Growth |
| --- | ---: | ---: | ---: |
| Monthly base price | Free | INR 1,999 | INR 4,999 |
| Standard AI replies | 100 total | 1,000/cycle | 4,000/cycle |
| Team members, including admin | 1 | 3 | 10 |
| Bots | 1 | 1 | 3 |
| Organizations covered | 1 | 1 | 1 |
| Stored uploads | 20 MB | 100 MB | 500 MB |
| Per file | 10 MB | 10 MB | 25 MB |
| Training sources | 5 | 20 | 100 |
| Active knowledge tokens | 50,000 | 500,000 | 2,000,000 |
| Processing tokens | 100,000 total | 1,000,000/cycle | 4,000,000/cycle |
| Transcript retention | 30 days | 90 days | 180 days |
| Lead retention | 30 days | 365 days | 365 days |
| Lead-volume advisory | 50 | 1,000 | 5,000 |

Lead volume is advisory, not a hard monthly capture limit. Each additional organization needs its own subscription. One trial is recorded per user, and deleting an organization does not reset eligibility. Valid pending invites reserve seats for 14 days.

Extra capacity: INR 699 plus applicable tax for 1,000 standard replies, expires 90 days after payment, usable only with active paid access. No automatic recharge. Test chats count. Failed AI turns release the reply reservation while retaining available provider-cost records. Retries with the same request ID do not double-charge. Auxiliary AI and training work have separate bounded accounting.

Cancellation stops future collections and preserves paid-through access. Plan changes take effect at the next verified renewal, with capacity checks and pending-downgrade restrictions. A failed renewal provides a three-day grace period using the remaining old allowance, without resetting it. Signed refund events record partial refunds idempotently; full current-period refunds stop that paid access, while refunds of older cycles do not remove a newer paid cycle. Full reply-pack refunds revoke that pack.

## Configuration

Set these in the ignored dashboard `.env.local` for development:

```dotenv
APP_URL=http://localhost:4000
PYTHON_API_URL=http://localhost:18000
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_API_VERSION=2026-01-01
CASHFREE_CLIENT_ID=<sandbox app id>
CASHFREE_CLIENT_SECRET=<sandbox secret>
BILLING_ALLOW_LIVE=false
BILLING_MAINTENANCE_SECRET=<same random secret as chat_api>
BILLING_TAX_BPS=1800
BILLING_VENDOR_IS_SAMPLE=true
BILLING_BUSINESS_NAME=Sample Chat Software Private Limited
BILLING_BUSINESS_ADDRESS=123 Sample Technology Park, Bengaluru, Karnataka 560001, India
BILLING_GSTIN=29ABCDE1234F1Z5
BILLING_STATE_CODE=29
BILLING_SAC=998314
BILLING_SUPPORT_EMAIL=billing@example.invalid
```

These are sample vendor/tax/classification values for sandbox documents. Replace them with the actual legal entity, address, GSTIN, state, SAC, confirmed tax treatment and support contact before commercial use. The sample 18% setting is configurable. Interstate invoices use IGST; intrastate invoices split CGST and SGST, or applicable UTGST. Integer rounding preserves the exact tax total. Production rejects sample/incomplete vendor configuration and requires explicit live enablement.

`CASHFREE_WEBHOOK_SECRET`, when set, overrides the API secret used for webhook signature verification. Register the correct signing secret and public HTTPS `/api/billing/webhook` URL with Cashfree. Subscribe to subscription authorization/status/payment and refund events, and payment/refund events for ordinary reply-pack orders. Localhost cannot receive external provider callbacks without a public tunnel.

The existing `chat_api` RQ scheduler runs billing maintenance every five minutes. Configure its `DASHBOARD_APP_URL` and matching `BILLING_MAINTENANCE_SECRET`. For local Docker, the dashboard URL is `http://host.docker.internal:4000`. Maintenance reconciles collections, retries retained events, recovers stale reservations and records dashboard notices. Cashfree's subscription API does not expose a refund-list endpoint: subscription refund discovery depends on signed webhook delivery. Reply-pack refunds are also reconciled using the order-refunds endpoint.

The JSON export includes organization, bots, leads/follow-ups, conversation metadata/messages and source/file metadata. It does not embed original uploaded binaries. Closed transcript and lead retention use a persisted seven-day notice before removal; expired organizations have a 30-day recovery window. Billing notices currently use dashboard notifications, not email.

## Database and verification

Apply migrations with `prisma migrate deploy`, then `prisma generate`. Billing migrations:

- `20261016150000_billing`
- `20261016180000_billing_refunds`
- `20261016190000_billing_invoices`
- `20261016200000_preserve_trial_claims`

Use `scripts/seed-billing.ts` to initialize existing organizations. Run the chat service's `app.scripts.backfill_billing_sources` once to account for existing active corpus without charging historical processing.

Core checks:

```sh
node --env-file=.env.local --import tsx --test lib/billing/billing.test.ts
RUN_BILLING_DB_TESTS=1 node --env-file=.env.local --import tsx --test lib/billing/billing.test.ts
node --env-file=.env.local --import tsx scripts/test-billing-storage.ts
```

DB checks and storage verification create and remove dedicated temporary development records/objects. They must use a development database. Browser checks use Playwright; set `BILLING_TEST_BROWSER` to a local Chromium-compatible executable if the bundled browser is not installed. Optional paths: `BILLING_TEST_WORK_DIR`, `BILLING_TEST_OUTPUT_DIR`, `BILLING_TEST_FIXTURES`, `BILLING_TEST_BASE_URL`. Defaults keep private fixtures and outputs under ignored `.billing-test/`.

Sandbox lifecycle scripts create actual Cashfree sandbox subscriptions/orders and retain their dedicated test organizations for payment audit. Do not run them in production. Start with `test-cashfree-sandbox.ts`, use `simulate-cashfree-sandbox.ts` and `verify-cashfree-sandbox.ts` to complete/verify outcomes, then `test-cashfree-lifecycle.ts` and `verify-pack-sandbox.ts`. The simulation endpoint uses the provider's older simulation API version while normal requests use the configured current version. Browser scripts cover hosted checkout, required billing details, checkout returns, ownership, invoices and widget fallback. Fixture auth tokens expire after two hours; regenerate them locally when needed.

For a populated invoice preview, run `node --env-file=.env.local --import tsx scripts/seed-invoice-demo.ts <development-organization-id>`. This sandbox-only, idempotent script adds three explicitly marked sample receipts/invoices: two eligible downloads and one waiting for the seven-day date. It does not create provider requests, credit packs, billing periods or subscription entitlement changes. These preview records stay until deliberately removed.

## Before a live pilot

Provide real vendor/tax/support information, approved live Cashfree Subscriptions credentials, an HTTPS app URL and registered webhooks. Verify actual recurring collection, settlement, cancellation and refund in a separately authorized small live pilot. Sandbox tests do not prove those live outcomes.

Annual plans, proration, automatic recharge, postpaid usage, shared multi-organization wallets, arbitrary premium models, BYOK and billing email delivery are outside this MVP. New catalogue versions require an explicit migration/offer policy for existing subscribers; changing a constant must not silently rewrite their saved allowance.
