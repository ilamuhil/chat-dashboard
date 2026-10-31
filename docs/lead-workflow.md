# Lead ownership, scoring, follow-ups and alerts

Implemented for the MVP on 30 October 2026.

## Delivery plan and scope

1. Establish one lead owner. Reuse organization members as counsellors, validate membership on write, and expose assignment/reassignment on the list and profile. Provide All leads, My leads and Unassigned queues, plus counsellor and priority filters. Return work to Unassigned when a member leaves.
2. Make priority deterministic. Keep the existing lead_priority and priority_reason columns. Compute both from current accepted facts for every writer, including the chat backend. Save a human-readable explanation. Do not infer from summaries, unresolved observations, demographic attributes or predictive AI.
3. Build the cross-lead worklist. Add Users → Follow-ups, reusable profile controls, requested queues, search, counsellor filtering, task editing/rescheduling, completion/reopening, cancellation and deletion. Sort urgent work first and use creation order to prevent older tasks getting buried. Provide responsive layouts and explicit loading, empty, error and mutation states.
4. Connect alerts. Record hot/qualified transitions atomically with lead writes. Use existing RQ scheduling for due/overdue reminders and retryable email delivery. Keep dashboard polling and the existing notification menu. Link notifications directly to the appropriate lead or task. Prevent refreshes, overlapping workers and dismissed notifications from creating repeated alerts.
5. Verify. Test scoring and organization boundaries in PostgreSQL, reminder receipts through the actual SQL, delivery with a fake provider, existing backend lead regressions, types/lint, and browser interactions in both themes.

Automatic assignment, predictive scoring, configurable scoring editors, new queues/services and additional roles remain outside this MVP.

## Small database change

The Prisma migration `20261030120000_lead_workflow` adds three nullable columns:

- `leads.assigned_counsellor_id`: organization member user ID.
- `notifications.event_key`: unique durable event receipt.
- `notifications.dismissed_at`: dismissal timestamp; clearing the bell preserves duplicate-prevention receipts.

It adds owner/worklist indexes and a unique event-key index. Existing follow-up fields and notification JSON hold delivery state; no new tables or dependencies are required.

PostgreSQL functions keep scoring and hot/qualified events consistent across Next.js and Python. Prisma remains the schema authority; Python mirrors the new fields. The initial backfill recalculates active lead priorities without sending historical hot-lead emails. A departing-member trigger clears lead and task assignments. Runtime APIs enforce organization membership, and a database check also prevents assigning a lead to another organization's user.

## Ownership behavior

All existing organization editors/admins retain their existing lead editing access. Assignment is an operational owner, not an access restriction. Only existing organization administrators can delete leads. Follow-up editing/deletion uses the existing organization member policy.

Lead ownership and follow-up ownership are distinct. New manual follow-ups default to the selected lead's owner, and can be reassigned or left unassigned. Changing a lead owner preserves explicit task assignments. Existing leads start unassigned. No automatic distribution is added.

## Rules v1

Only persisted lead facts participate. Intent and pipeline action points are counted once, using the strongest relevant signal.

- Joining ASAP, immediately or within one week: +40.
- Joining within one month or next available intake: +30.
- Joining within three months: +15.
- Application intent or Application started stage: +35.
- Counselling, demo, campus-visit intent or Counselling requested stage: +30.
- Fees, eligibility (including the legacy spelling), batch/schedule or course recommendation intent: +15.
- Course information intent: +10.
- Course interest recorded: +10.
- Email or phone recorded: +10 total.
- Explicit contact consent: +10.

Hot requires 70+ points, contact details and explicit consent. Warm requires 35+ points. Otherwise the lead is Cold. Enrolled/Lost leads and leads with explicitly refused/withdrawn consent are Cold regardless of points. Missing consent caps a high score at Warm. Vague free-text dates are not interpreted as imminent joining; the canonical joining timeline must supply that fact.

The saved reason includes the rule version, points and matching facts, thresholds and any contact/consent limitation. Points are not a probability or a score out of 100. Priority is derived; the UI edits the underlying facts rather than offering a priority override. Pipeline qualification remains a counsellor decision and does not infer academic eligibility.

## Worklist semantics

All displayed schedules and datetime inputs use Asia/Kolkata (IST), independent of browser/server timezone.

- Open: all pending tasks, including unscheduled tasks.
- Due today: pending tasks scheduled on today's IST date, including tasks already overdue today.
- Upcoming: pending tasks scheduled after today's IST date.
- Overdue: pending tasks whose scheduled timestamp has passed.
- Completed: status `complete`.
- Unassigned: pending tasks without an explicit task counsellor.
- Unscheduled: pending tasks without a scheduled timestamp.
- Cancelled: status `cancelled`.

Due today and Overdue can overlap deliberately. Active work orders Overdue → Due today → Upcoming → Unscheduled, then oldest `created_at` first within each group; ID breaks timestamp ties. Completion records completed_at; reopening clears it. Completed/cancelled tasks remain accessible without cluttering active work.

Search and counsellor filters apply before queue counts. Lists paginate locally, consistent with the existing lead list, and refresh once per minute. An event link focuses its exact task, including completed/cancelled tasks. Clear filters returns to the full worklist. Long notes expand on demand. Deleted tasks/leads are excluded everywhere.

## Notifications and email delivery

- Entering Hot creates a `lead_hot` notification with the saved scoring explanation.
- Entering Qualified creates a `lead_qualified` notification.
- Hot/qualified events target the lead owner; unassigned leads target organization admins.
- The daily planning reminder (`follow_up_due`) is created while a pending task is scheduled later today.
- Once its scheduled timestamp passes, a single `follow_up_overdue` reminder is created. If the scheduler recovers after a deadline, it emits the overdue event without backfilling an obsolete due-today email.
- Follow-up alerts target the task counsellor, otherwise the lead owner, otherwise organization admins. An unassigned task remains in the Unassigned queue even if its lead owner receives its alert.
- Each follow-up receipt includes event kind, task ID, schedule and recipient. Rescheduling/reassignment can therefore create an appropriate new notice while repeats of the same job do not.

The existing notifications table is the email outbox. A short row-lock transaction claims work with `FOR UPDATE SKIP LOCKED`. Delivery happens outside the lock, with a lease, a bounded network timeout, backoff and a stable Resend idempotency key. Failed delivery does not remove a dashboard alert. Retrying checks current organization membership, task state, schedule and owner to skip stale messages. Email is also suppressed if a hot/qualified lead is no longer in that state.

[Resend idempotency keys last 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys). Automatic retry stops before that expiry after an ambiguous attempt, or after eight failures. Delivery outcome is stored in `notifications.channels` (`pending`, `sending`, `sent`, `skipped`, `failed`) alongside attempts, retry time and provider message ID. No delivery is marked successful when provider configuration is missing. Dismissing a notification does not cancel its pending email.

Dashboard notifications use the existing 30-second polling fallback; realtime human-handoff notifications continue through their existing path. Expected reminder latency is the scheduler interval plus dashboard polling.

## Operation

The chat backend registers `run_lead_workflow_maintenance` on the existing `default` RQ queue every 60 seconds. It POSTs to `/api/dashboard/leads/maintenance`; the dashboard runs scheduling and email delivery. The endpoint requires a constant-time checked bearer secret and does not accept ordinary browser membership as maintenance authorization.

Required configuration:

- Backend `DASHBOARD_APP_URL` points to the dashboard reachable from the worker. In Docker on this Mac this must reach the host, rather than using the container's localhost.
- `LEAD_WORKFLOW_MAINTENANCE_SECRET` can be set on both services. If absent, the existing matching `BILLING_MAINTENANCE_SECRET` is reused.
- Dashboard `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and the existing sender name configure email.
- `NEXT_PUBLIC_APP_URL` or `DASHBOARD_APP_URL` on the dashboard supplies the public origin for email links. Local development falls back to localhost:4000.

Deployment sequence: apply the Prisma migration using a direct database connection, generate the Prisma client, restart the dashboard, then reload the existing API/worker/scheduler processes. No new infrastructure is needed. The local development migration has been applied, the dashboard restarted on port 4000, and authenticated scheduler calls have been observed returning 200.

## Verification

- `pnpm exec tsx --test tests/leads/workflow.test.ts tests/leads/alert-delivery.test.ts`: timezone, queue lifecycle, FIFO order, safe email rendering, retry identity, stale recipients and retry expiry. No real emails sent.
- Opt in with `RUN_LEAD_DB_TESTS=true` and a direct `DATABASE_URL` to run `tests/leads/database.test.ts`. It validates the migration if not installed, scoring, transition receipts, cross-organization assignment rejection, departed-member cleanup, reminder deduplication, dismissal, rescheduling and reassignment. Every database fixture/write rolls back.
- Dashboard TypeScript and ESLint checks cover the changed source.
- Backend regression command: `.venv/bin/python -m unittest tests.test_worker_imports tests.test_lead_capture tests.test_lead_locking tests.test_lead_fastpath -q`.

The scoring function and alert triggers are deliberate cross-writer boundaries. Changes to rules must update the migration/function and its PostgreSQL cases together.
