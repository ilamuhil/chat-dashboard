# Admissions operations implementation plan

## Scope and sequence

1. **Request review and confirmation.** Reuse follow-up status with `requested` (Needs review). AI-created requests retain the visitor's timing as notes. Staff review the request, choose an organization counsellor, and explicitly confirm a future IST schedule. Confirmation checks consent and the contact channel, uses a parent-lead lock and existing updated_at for conflict detection, and never claims calendar availability. Visitor changes to an already-confirmed request reopen review; cancellation or withdrawn consent cancels outstanding contact work.
2. **Dependable next action.** Derive recommended_next_action in the database from accepted lead fields, open requests/tasks and terminal stages. Keep one cross-writer producer and remove the conflicting manual override. Prefer review/assignment/scheduling of actual work over generic suggestions. Recompute when lead facts or tasks change.
3. **Notes and activity history.** Use one LeadActivities table for standalone internal notes and audit events. Notes may be edited by their author or an Owner/Admin; audit events stay append-only. Every edit atomically stores its previous and new text in a separate attributed event, and a version prevents stale edits from overwriting newer content. Record actor identity/name, timestamp and before/after changes atomically with writes. Apply authenticated actor context only inside a transaction; tag visitor-originated backend writes explicitly. Combine activity with conversation links in the profile timeline. Preserve historical actor labels after membership removal. Never invent pre-migration changes.
4. **Outcomes and loss reasons.** Add only a nullable lost_reason column to Leads. Require a reason on new Lost transitions. Connect explicit completed-task outcomes (application started, enrolled, lost) to the existing pipeline in the same transaction. Keep old reasons/outcomes in activity when a lead reopens; preserve current-stage decisions when an unrelated task note changes.
5. **Admissions reporting.** Add an Admissions analytics workspace with cohort dates, current qualified/counselling/enrolment/loss counts, conversion denominators, course/source/current-owner breakdowns and observed stage progression/drop-off. Count leads once, keep open leads separate from losses, and state that audit-backed history begins at this release. Do not assume every applicant takes a linear path. Add tenant-scoped reporting of existing retrieval no-evidence signals; label them as questions to review, distinguish service errors and clarify that missing evidence does not prove the final answer was wrong.
6. **Verification and rollout.** Test the migration in a rolled-back PostgreSQL transaction before applying it. Exercise consent changes, missing/removed counsellors, stale edits, repeated writes, task/lead consistency, notes idempotency, actor isolation and audit completeness. Test analytics against skipped/backward stages, duplicate requests, reopened outcomes, empty cohorts and cross-tenant records. Check Python lead-capture regressions, report authorization, TypeScript/lint/build, and light/dark/mobile browser flows. Use synthetic data and fake email transport; clean up UI fixtures.

## Minimal data changes

- One `lead_activities` table, indexed by lead/time and organization/time.
- One nullable `leads.lost_reason` column.
- Reuse follow-up status, source_request_id, notes and updated_at; no calendar integration, new service, or separate event bus.
- Keep existing Prisma schema/migrations authoritative and retain the existing rules-based scoring, pipeline stages and notification scheduler.

## Metric definitions

- Cohort: non-deleted organization leads captured in the selected inclusive IST date range.
- Current-stage counts: current saved pipeline stage, not an inferred history.
- Conversion: currently Enrolled / all cohort leads; zero denominator is shown as unavailable.
- Requests: distinct saved callback/demo/visit requests, with a separate count of leads with requests.
- Observed progression: for each stage, distinct leads explicitly observed there in current data or recorded activity; progression requires a later event into a later active stage or Enrolled. A current Lost outcome is reported separately from still-open work. Jumps and reversals are not rewritten into fictional stage visits.
- Breakdowns: per lead, grouped by current normalized course, bot/manual source and current assigned owner. These are operational attribution, not historical counsellor performance.
- Questions to review: existing retrieval records explicitly flagged no_evidence/clarification/unavailable, deduplicated by conversation/message where a message ID exists, with original question and conversation links. Retrieval errors are distinct from knowledge gaps. This is not an AI assessment of answer correctness.

Implementation and verification results will be recorded below as work progresses.

## Implementation and verification results

All six steps are implemented. Migration `20261030150000_admissions_operations` was validated in a rolled-back PostgreSQL transaction, then applied to the development database. It adds the single activity table and loss-reason column described above; request review uses the existing follow-up records. Existing requests without an owner or schedule enter Needs review.

- **Dashboard:** all 13 workflow, reporting, notification and PostgreSQL tests pass, including both opt-in database suites. TypeScript, targeted ESLint and the production build pass.
- **Backend:** all 37 admissions, lead-capture, fast-path, PostgreSQL locking, worker-import and maintenance tests pass with both PostgreSQL opt-ins enabled; no skipped cases. Extractor responses are mocked; tests do not call a paid model or send emails.
- **Request edges:** consent and channel requirements; missing/outside-organization counsellors; past/missing schedules; stale versions; confirmed requests preserved on unchanged chat turns; changed timing reopened for review; completed tasks protected from AI resurrection; contact removal and withdrawn consent cancel active contact work.
- **Audit/outcome edges:** staff, visitor and system attribution; organization isolation; no audit noise from derived-only updates; required loss reasons; reopening preserves historical reasons; task completion and lead outcome commit together. Notes reuse a client-generated ID across retries and reject conflicting reuse.
- **Reporting edges:** zero denominators; inclusive IST boundaries; invalid and overlong windows; skipped/repeated/backward stages; distinct owner identities; normalized courses; unknown legacy stages; request deduplication; latest retrieval retry per message; report membership checks and cross-tenant exclusion.
- **Browser:** reviewed and confirmed a synthetic callback; verified the 2:30 pm IST schedule round-trip; rejected a stale task update with HTTP 409 and preserved the newer notes; saved an independent internal note; completed the task as Lost and verified the lead reason, stored next action and attributed timeline events. Checked activity history in both themes. A development connection interruption exposed the need for the worklist retry button to refresh server data; recovery now does so.
- The synthetic UI lead is soft-deleted and excluded from active queues and reports. Test notification emails were not sent.

History starts with this release and a current-state baseline; earlier assignments and stage changes cannot be reconstructed. Conversion and owner breakdowns use current outcomes/ownership for the selected capture cohort. Unanswered-enquiry reporting is a review queue based on logged retrieval signals, which may include greetings or non-admissions messages; it does not assert that the final reply was wrong or add a new AI classifier. Visitor appointment agreement remains a staff action after request review, without live calendar availability.
