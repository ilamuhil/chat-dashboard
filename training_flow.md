# Training flow

The dashboard currently uses the following route handlers:

- `POST /api/training-source/url` to add a website URL.
- `POST /api/training-source/file/upload` to upload a file to storage.
- `POST /api/training-source/file/finalize` to verify uploaded files and
  finalize their training-source records.
- `DELETE /api/training-source` to remove a training source.
- `POST /api/training/[bot_id]` to start training for a bot.

The older `/training/upload/init` endpoint referenced below is obsolete.

## File upload flow

1. Send files to `/api/training-source/file/upload`
   a. Create or identify the training source
   b. Upload the file to object storage
2. Call `/api/training-source/file/finalize` after the upload.

---

## Retry mechanism

Retry the upload and finalize flow:

c. Compute or reuse the content hash for each file.
d. Check for an existing training source for the bot and organization.

- If exists, return existing training source id
- Else, do 1a.

## Database state

Check if file exists in storage for each of the training sources:

- If yes:
  - DB mutation wrapped in a transaction:
a. Keep the training source and file records scoped to the organization and bot.
b. Finalization verifies storage, creates or updates the file record, and updates
   the training source status.
- Else:
a. Mark the source as `upload_failed` when the object is missing or verification
   fails.



## Training source statuses (phase 1)

`pending` → intent created, upload expected  
`created` → file verified + file record created  
`upload_failed` → upload never completed

## File record statuses (phase 1)

`uploaded` → file verified

## Risks

- Upload succeeds and finalize API not called / user abandons flow midway (orphaned files and training source records) -> can be cleaned up by worker



## Status reference


| Table name    | Status                | When to update                         |
| ------------- | --------------------- | -------------------------------------- |
| training_jobs | `queued`              | Job created                            |
| training_jobs | `processing`          | Worker starts job                      |
| training_jobs | `completed`           | All sources trained successfully       |
| training_jobs | `partially_completed` | Some sources trained, some failed      |
| training_jobs | `failed`              | Job fails before any source is trained |
| training_jobs | `cleanup_completed`   | Cleanup for soft-deleted sources done  |



| Table name       | Status                | When to update                             |
| ---------------- | --------------------- | ------------------------------------------ |
| training_sources | `pending`             | Source record created                      |
| training_sources | `created`             | Upload / fetch initiated                   |
| training_sources | `upload_failed`       | Upload or fetch fails                      |
| training_sources | `queued_for_training` | When the job is enqueued successfully      |
| training_sources | `training`            | Training job starts processing this source |
| training_sources | `trained`             | Source successfully embedded               |
| training_sources | `training_failed`     | Training fails for this source             |



| Table name | Status              | When to update           |
| ---------- | ------------------- | ------------------------ |
| files      | `uploaded`          | Upload completes         |
| files      | `processing`        | Text extraction starts   |
| files      | `processed`         | Text extraction succeeds |
| files      | `processing_failed` | Text extraction fails    |


| Table name | Status              | When to update           |
| ---------- | ------------------- | ------------------------ |
| conversations_meta | `open`            | Conversation is active |
| conversations_meta | `closed`          | Conversation is closed |
| conversations_meta | `is_archived=true`| Conversation is archived |

Training failures belong to individual sources (`training_failed`) and the
training job (`failed` or `partially_completed`). Model configurations use only
`draft`, `training`, `active`, and `deprecated`; unsuccessful initial training
returns the configuration to `draft`.

`TrainingSources.errorMessage` is a JSONB error-history array, defaulting to `[]`.
Each error has an ID, code, stage, message, suggested action, retryability,
timestamp, source/job IDs, and `resolved_at`. Successful source retries mark
previous errors resolved rather than deleting the history. The training GET
route returns `errors` and `retry_available` per source; POST accepts selected
`source_ids` and `retry_failed: true`. The UI offers individual and all-failed
retries while leaving trained sources alone. Queue errors are recorded on
sources too, including failures reaching the Python service.

Dashboard DB migrations use Prisma from this repository exclusively. Migration
`20261005123000_structured_training_errors` converts existing source errors to
JSONB without discarding their messages. Chat DB migrations use Alembic from
chat_api; revision `6e40a12bc893` handles job errors and configuration states.
