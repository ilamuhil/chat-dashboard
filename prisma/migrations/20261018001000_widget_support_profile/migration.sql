-- Optional visitor-facing support details; no invented contact or availability.
ALTER TABLE "public"."bots"
  ADD COLUMN "support_email" VARCHAR(254),
  ADD COLUMN "support_team_name" VARCHAR(60),
  ADD COLUMN "human_reply_minutes" INTEGER,
  ADD COLUMN "support_hours" VARCHAR(120),
  ADD COLUMN "help_center_url" VARCHAR(2048),
  ADD CONSTRAINT "bots_human_reply_minutes_check"
    CHECK ("human_reply_minutes" BETWEEN 1 AND 10080);
