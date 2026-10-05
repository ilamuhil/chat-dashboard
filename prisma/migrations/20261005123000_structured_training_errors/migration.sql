-- Dashboard DB only. The Chat DB is migrated with Alembic in chat_api.
ALTER TABLE "public"."training_sources"
ALTER COLUMN "error_message" TYPE JSONB
USING CASE
  WHEN "error_message" IS NULL OR btrim("error_message") = '' THEN '[]'::jsonb
  ELSE jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'code', 'legacy_training_error',
    'stage', 'worker',
    'message', "error_message",
    'action', 'Retry training. If the issue continues, contact support.',
    'retryable', true,
    'occurred_at', "updated_at",
    'job_id', NULL,
    'source_id', "id"::text,
    'resolved_at', CASE WHEN "status" = 'trained' THEN "last_trained_at" ELSE NULL END
  ))
END;

ALTER TABLE "public"."training_sources"
ALTER COLUMN "error_message" SET DEFAULT '[]'::jsonb,
ALTER COLUMN "error_message" SET NOT NULL;
